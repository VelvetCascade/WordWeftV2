package com.wordweft.foundingwriter.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.zip.ZipInputStream;

/** Checks file format, not manuscript quality or chapter count. Never executes uploaded content. */
final class ChapterFileValidator {
    static final int MAX_BYTES = 5 * 1024 * 1024;
    record ChapterFile(String name, String contentType, byte[] data) {}

    static ChapterFile validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("Upload a file containing at least three chapters.");
        if (file.getSize() > MAX_BYTES) throw invalid("The chapter file must be 5 MB or smaller.");
        String name = file.getOriginalFilename();
        name = name == null ? "" : name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "_");
        if (name.isBlank() || name.length() > 180) throw invalid("Use a filename of 180 characters or fewer.");
        String lower = name.toLowerCase(Locale.ROOT);
        try {
            byte[] data = file.getBytes();
            String type;
            if (lower.endsWith(".pdf")) {
                if (!new String(data, 0, Math.min(5, data.length), StandardCharsets.US_ASCII).equals("%PDF-")) throw invalid("The file is not a valid PDF.");
                type = "application/pdf";
            } else if (lower.endsWith(".txt")) {
                String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(data)).toString();
                if (text.isBlank() || text.indexOf('\0') >= 0) throw invalid("Upload a non-empty UTF-8 text file.");
                type = "text/plain";
            } else if (lower.endsWith(".docx")) {
                boolean document = false, contentTypes = false;
                long expanded = 0;
                int entries = 0;
                try (var zip = new ZipInputStream(new ByteArrayInputStream(data))) {
                    java.util.zip.ZipEntry entry;
                    byte[] buffer = new byte[8192];
                    while ((entry = zip.getNextEntry()) != null) {
                        if (++entries > 1000) throw invalid("The DOCX file is too complex.");
                        if (entry.getName().equals("word/document.xml")) document = true;
                        if (entry.getName().equals("[Content_Types].xml")) contentTypes = true;
                        if (entry.getName().toLowerCase(Locale.ROOT).endsWith("vbaproject.bin")) throw invalid("Macro-enabled documents are not accepted.");
                        int count;
                        while ((count = zip.read(buffer)) != -1) {
                            expanded += count;
                            if (expanded > 25 * 1024 * 1024) throw invalid("The expanded DOCX file is too large.");
                        }
                    }
                }
                if (!document || !contentTypes) throw invalid("The file is not a valid DOCX document.");
                type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else throw invalid("Upload a PDF, DOCX, or TXT file.");
            return new ChapterFile(name, type, data);
        } catch (ResponseStatusException invalid) {
            throw invalid;
        } catch (java.io.IOException failure) {
            throw invalid("The chapter file could not be read. Upload a valid PDF, DOCX, or UTF-8 TXT file.");
        }
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
