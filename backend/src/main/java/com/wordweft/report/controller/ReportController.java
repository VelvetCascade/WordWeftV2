package com.wordweft.report.controller;

import com.wordweft.report.dto.ReportRequest;
import com.wordweft.report.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    @Autowired private ReportService reportService;

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ReportRequest request) {
        try {
            return ResponseEntity.ok(reportService.create(request));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @GetMapping("/mine")
    public ResponseEntity<?> mine() {
        return ResponseEntity.ok(reportService.mine());
    }
}
