package com.wordweft.support;

import io.imagekit.sdk.ImageKit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/imagekit")
public class ImageKitController {
    private static final Logger log = LoggerFactory.getLogger(ImageKitController.class);

    @Autowired
    private ImageKit imageKit;

    @org.springframework.beans.factory.annotation.Value("${imagekit.public-key:}")
    private String publicKey;

    @GetMapping("/auth")
    public ResponseEntity<?> getAuthParams(@RequestParam(required = false) String uploadId) {
        // Generate custom token and expire (30 mins from now) to mitigate server clock skew
        // which may push the default expire beyond 1 hour according to ImageKit's clock.
        String token = java.util.UUID.randomUUID().toString();
        long expire = (System.currentTimeMillis() / 1000) + 1800; // 30 minutes
        Map<String, String> authParams = imageKit.getAuthenticationParameters(token, expire);
        Map<String, Object> response = new java.util.HashMap<>(authParams);
        response.put("publicKey", publicKey);
        log.info("image_upload_auth uploadId={} user={}", safe(uploadId), currentUser());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/events")
    public ResponseEntity<Void> recordUploadEvent(@Valid @RequestBody UploadEvent event) {
        log.info("image_upload_event uploadId={} user={} event={} contentType={} sizeBytes={} httpStatus={} detail={}",
                safe(event.uploadId()), currentUser(), event.event(), safe(event.contentType()), event.sizeBytes(),
                event.httpStatus(), safe(event.message()));
        return ResponseEntity.noContent().build();
    }

    private static String currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return "anonymous";
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.wordweft.security.services.UserDetailsImpl user) return safe(user.getId());
        return "authenticated";
    }

    private static String safe(String value) {
        if (value == null || value.isBlank()) return "-";
        String cleaned = value
                .replaceAll("(?i)(token|signature|password|private[_-]?key)\\s*[:=]\\s*[^\\s,}]+", "$1=[redacted]")
                .replaceAll("[\\r\\n\\t]", "_");
        return cleaned.substring(0, Math.min(cleaned.length(), 300));
    }

    public record UploadEvent(
            @NotBlank @Size(max = 80) String uploadId,
            @NotBlank @Pattern(regexp = "selected|auth_ready|uploaded|failed") String event,
            @Size(max = 100) String contentType,
            @Min(0) @Max(10485760) Long sizeBytes,
            @Min(100) @Max(599) Integer httpStatus,
            @Size(max = 300) String message) {}
}
