package com.wordweft.admin;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/console")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSheetAnalyticsController {
    private final AdminSheetAnalyticsService sheets;

    public AdminSheetAnalyticsController(AdminSheetAnalyticsService sheets) {
        this.sheets = sheets;
    }

    @GetMapping("/analytics")
    public ResponseEntity<AdminSheetAnalyticsService.Summary> analytics(@RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(sheets.summary(days));
    }
}
