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
        // Generates the token, expire, and signature using ImageKit configuration
        Map<String, String> authParams = imageKit.getAuthenticationParameters();
        Map<String, Object> response = new java.util.HashMap<>(authParams);
        response.put("publicKey", publicKey);
        return ResponseEntity.ok(response);
    }
}
