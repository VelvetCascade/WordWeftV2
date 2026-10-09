package com.wordweft.book.controller;

import com.wordweft.book.service.WriterQuickstartService;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WriterQuickstartController {
    private final WriterQuickstartService progress;
    public WriterQuickstartController(WriterQuickstartService progress) { this.progress = progress; }
    @GetMapping("/api/writer/quickstart")
    public ResponseEntity<WriterQuickstartService.Progress> get(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "private, no-store").varyBy("Authorization")
                .body(progress.get(user == null ? null : user.getId()));
    }
}
