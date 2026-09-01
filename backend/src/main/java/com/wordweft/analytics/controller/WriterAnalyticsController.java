package com.wordweft.analytics.controller;

import com.wordweft.analytics.dto.WriterAnalyticsResponse;
import com.wordweft.analytics.service.WriterGrowthService;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/writer/analytics")
public class WriterAnalyticsController {
    private final WriterGrowthService growth;

    public WriterAnalyticsController(WriterGrowthService growth) {
        this.growth = growth;
    }

    @GetMapping
    public WriterAnalyticsResponse getAnalytics(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(required = false) String bookId) {
        return growth.getAnalytics(user.getId(), bookId, Instant.now());
    }
}
