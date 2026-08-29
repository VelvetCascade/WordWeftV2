package com.wordweft.discovery.controller;

import com.wordweft.book.service.ContentAccessService;
import com.wordweft.discovery.dto.HookFeedResponse;
import com.wordweft.discovery.service.HookFeedService;
import com.wordweft.discovery.service.ReaderTasteService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/discovery")
public class HookFeedController {
    private final HookFeedService hooks;
    private final ReaderTasteService tastes;
    private final ContentAccessService access;

    public HookFeedController(HookFeedService hooks, ReaderTasteService tastes, ContentAccessService access) {
        this.hooks = hooks;
        this.tastes = tastes;
        this.access = access;
    }

    @GetMapping("/hooks")
    public HookFeedResponse hooks(
            @RequestParam(defaultValue = "") String exclude,
            @RequestParam(defaultValue = "") String genres,
            @RequestParam(defaultValue = "10") int limit) {
        String userId = access.currentUserId();
        Set<String> excluded = split(exclude);
        List<String> requestedTaste = new java.util.ArrayList<>(split(genres));
        return requestedTaste.isEmpty()
                ? hooks.getFeed(userId, excluded, limit)
                : hooks.getFeed(userId, requestedTaste, excluded, limit);
    }

    @PutMapping("/taste")
    public ResponseEntity<?> updateTaste(@Valid @RequestBody TasteRequest request) {
        String userId = access.currentUserId();
        if (userId == null) throw new ResponseStatusException(UNAUTHORIZED, "Sign in to save your reading taste");
        try {
            return ResponseEntity.ok(Map.of("favoriteGenres", tastes.update(userId, request.favoriteGenres())));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(BAD_REQUEST, exception.getMessage());
        }
    }

    private Set<String> split(String value) {
        if (value == null || value.isBlank()) return Set.of();
        Set<String> parts = new LinkedHashSet<>();
        Arrays.stream(value.split(",")).map(String::trim).filter(part -> !part.isBlank()).forEach(parts::add);
        return parts;
    }

    public record TasteRequest(
            @Size(max = 8, message = "Choose up to eight genres")
            List<@NotBlank @Size(max = 40) String> favoriteGenres
    ) {}
}
