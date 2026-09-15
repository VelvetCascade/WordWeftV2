package com.wordweft.foundingwriter.controller;

import com.wordweft.foundingwriter.dto.FoundingWriterApplicationUpdateRequest;
import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.foundingwriter.service.FoundingWriterApplicationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/founding-writer-applications")
public class FoundingWriterAdminController {
    private final FoundingWriterApplicationService service;

    public FoundingWriterAdminController(FoundingWriterApplicationService service) {
        this.service = service;
    }

    @GetMapping
    public List<FoundingWriterApplication> list(
            @RequestParam(required = false) FoundingWriterApplicationStatus status) {
        return service.list(status);
    }

    @PatchMapping("/{id}")
    public FoundingWriterApplication update(
            @PathVariable String id,
            @Valid @RequestBody FoundingWriterApplicationUpdateRequest request) {
        return service.update(id, request);
    }
}
