package com.wordweft.growth.controller;

import com.wordweft.book.service.ContentAccessService;
import com.wordweft.growth.dto.GenreEventResponse;
import com.wordweft.growth.dto.ReadingChallengeResponse;
import com.wordweft.growth.service.GenreEventService;
import com.wordweft.growth.service.ReadingChallengeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/growth")
public class ReadingGrowthController {
    private final ReadingChallengeService challenges;
    private final GenreEventService events;
    private final ContentAccessService access;

    public ReadingGrowthController(ReadingChallengeService challenges, GenreEventService events, ContentAccessService access) {
        this.challenges = challenges;
        this.events = events;
        this.access = access;
    }

    @GetMapping("/challenges")
    public List<ReadingChallengeResponse> challenges() {
        return challenges.list(access.currentUserId(), Instant.now());
    }

    @PostMapping("/challenges/{challengeId}/join")
    public ReadingChallengeResponse join(@PathVariable String challengeId) {
        return challenges.join(access.currentUserId(), challengeId, Instant.now());
    }

    @GetMapping("/events")
    public List<GenreEventResponse> events() {
        return events.publicEvents(Instant.now());
    }

    @PostMapping("/events/{eventId}/submissions/{bookId}")
    public GenreEventResponse submit(@PathVariable String eventId, @PathVariable String bookId) {
        return events.submit(access.currentUserId(), eventId, bookId, Instant.now());
    }

    @PostMapping("/events")
    public GenreEventResponse create(@RequestBody GenreEventService.EventMutation request) {
        return events.create(access.currentUserId(), request, Instant.now());
    }

    @PutMapping("/events/{eventId}")
    public GenreEventResponse update(@PathVariable String eventId, @RequestBody GenreEventService.EventMutation request) {
        return events.update(access.currentUserId(), eventId, request, Instant.now());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> forbidden(AccessDeniedException exception) {
        return ResponseEntity.status(403).body(Map.of("message", exception.getMessage()));
    }
}
