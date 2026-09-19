package com.wordweft.book.service;

import com.wordweft.foundingwriter.service.UploadTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

@Service
public class ChapterImageStorageService {
    private static final Logger log = LoggerFactory.getLogger(ChapterImageStorageService.class);
    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration UPLOAD_TIMEOUT = Duration.ofSeconds(30);

    private final UploadTokenService uploadTokenService;
    private final HttpClient httpClient;

    @Autowired
    public ChapterImageStorageService(UploadTokenService uploadTokenService) {
        this(uploadTokenService, HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
    }

    ChapterImageStorageService(UploadTokenService uploadTokenService, HttpClient httpClient) {
        this.uploadTokenService = uploadTokenService;
        this.httpClient = httpClient;
    }

    public record ImageUploadResult(String url, String filename) {}

    public ImageUploadResult uploadChapterImage(String bookId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image file must not be empty.");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image exceeds the 5 MB size limit.");
        }
        try {
            byte[] bytes = file.getBytes();
            String originalName = file.getOriginalFilename();
            String url = uploadChapterImageBytes(bookId, originalName, bytes);
            String filename = url.substring(url.lastIndexOf('/') + 1);
            return new ImageUploadResult(url, filename);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read image file.", e);
        }
    }

    public String uploadChapterImageBytes(String bookId, String originalFilename, byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image bytes must not be empty.");
        }
        if (bytes.length > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image exceeds the 5 MB size limit.");
        }

        ImageInfo info = validateAndDetectImage(originalFilename, bytes);
        String uniqueName = generateUniqueFilename(info.extension());

        String workerBaseUrl = uploadTokenService.getWorkerBaseUrl();
        if (workerBaseUrl == null || workerBaseUrl.isBlank()) {
            log.error("WORKER_BASE_URL is not configured; refusing a chapter image upload for book {}", bookId);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage is temporarily unavailable. Please try again later.");
        }

        // Upload to R2 via Cloudflare Worker
        String token = uploadTokenService.generateChapterImageUploadToken(bookId, uniqueName, bytes.length);
        String url = workerBaseUrl.replaceAll("/+$", "") + "/upload/chapter-image/" + bookId + "/" + uniqueName;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(UPLOAD_TIMEOUT)
                    .PUT(HttpRequest.BodyPublishers.ofByteArray(bytes))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", info.contentType())
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Chapter image storage rejected an upload with status {}: {}",
                        response.statusCode(), safeResponseBody(response.body()));
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Image storage rejected the upload. Please try again.");
            }

            return workerBaseUrl.replaceAll("/+$", "") + "/chapter-images/" + bookId + "/" + uniqueName;
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image upload was interrupted. Please retry.", e);
        } catch (java.net.http.HttpTimeoutException e) {
            throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, "Image upload timed out. Please retry.", e);
        } catch (Exception e) {
            log.error("Error uploading chapter image to worker", e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image storage is unavailable. Please retry.", e);
        }
    }

    private record ImageInfo(String contentType, String extension) {}

    private ImageInfo validateAndDetectImage(String originalFilename, byte[] bytes) {
        String lowerName = (originalFilename != null) ? originalFilename.toLowerCase(Locale.ROOT) : "";
        if (lowerName.endsWith(".svg")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SVG images are not permitted for security reasons.");
        }

        // Sniff header for SVG/XML text
        if (bytes.length >= 4) {
            String headerText = new String(bytes, 0, Math.min(bytes.length, 256), StandardCharsets.US_ASCII).toLowerCase(Locale.ROOT);
            if (headerText.contains("<svg") || (headerText.contains("<?xml") && headerText.contains("<svg"))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SVG images are not permitted for security reasons.");
            }
        }

        // JPEG: FF D8 FF
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return new ImageInfo("image/jpeg", ".jpg");
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.length >= 8 &&
                (bytes[0] & 0xFF) == 0x89 && (bytes[1] & 0xFF) == 0x50 &&
                (bytes[2] & 0xFF) == 0x4E && (bytes[3] & 0xFF) == 0x47 &&
                (bytes[4] & 0xFF) == 0x0D && (bytes[5] & 0xFF) == 0x0A &&
                (bytes[6] & 0xFF) == 0x1A && (bytes[7] & 0xFF) == 0x0A) {
            return new ImageInfo("image/png", ".png");
        }

        // GIF: GIF8
        if (bytes.length >= 4 &&
                bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') {
            return new ImageInfo("image/gif", ".gif");
        }

        // WebP: RIFF....WEBP
        if (bytes.length >= 12 &&
                bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
                bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return new ImageInfo("image/webp", ".webp");
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Unsupported image format. Allowed formats: WebP, JPEG, PNG, GIF.");
    }

    static String generateUniqueFilename(String detectedExtension) {
        String base = "img_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        return base + detectedExtension;
    }

    private String safeResponseBody(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) return "(empty response)";
        String singleLine = responseBody.replaceAll("[\\r\\n]+", " ");
        return singleLine.length() > 300 ? singleLine.substring(0, 300) + "..." : singleLine;
    }
}
