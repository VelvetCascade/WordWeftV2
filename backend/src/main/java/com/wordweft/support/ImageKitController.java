package com.wordweft.support;

import io.imagekit.sdk.ImageKit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/imagekit")
public class ImageKitController {

    @Autowired
    private ImageKit imageKit;

    @org.springframework.beans.factory.annotation.Value("${imagekit.public-key:}")
    private String publicKey;

    @GetMapping("/auth")
    public ResponseEntity<?> getAuthParams() {
        // Generate custom token and expire (30 mins from now) to mitigate server clock skew
        // which may push the default expire beyond 1 hour according to ImageKit's clock.
        String token = java.util.UUID.randomUUID().toString();
        long expire = (System.currentTimeMillis() / 1000) + 1800; // 30 minutes
        Map<String, String> authParams = imageKit.getAuthenticationParameters(token, expire);
        Map<String, Object> response = new java.util.HashMap<>(authParams);
        response.put("publicKey", publicKey);
        return ResponseEntity.ok(response);
    }
}
