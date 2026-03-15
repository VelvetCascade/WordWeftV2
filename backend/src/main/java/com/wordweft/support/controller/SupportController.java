package com.wordweft.support.controller;

import com.wordweft.support.dto.GrievanceRequest;
import com.wordweft.support.model.Grievance;
import com.wordweft.support.service.SupportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService supportService;

    public SupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @PostMapping("/grievances")
    public ResponseEntity<?> submitGrievance(@Valid @RequestBody GrievanceRequest request) {
        try {
            Grievance savedGrievance = supportService.createGrievance(request);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Grievance submitted successfully",
                "grievanceId", savedGrievance.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
}
