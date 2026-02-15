package com.wordweft.ice.controller;

import com.wordweft.ice.model.FeedbackInsight;
import com.wordweft.ice.model.IceWorkspace;
import com.wordweft.ice.model.StoryBibleEntity;
import com.wordweft.ice.service.IceWorkspaceService;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ice")
public class IceWorkspaceController {

    @Autowired
    private IceWorkspaceService workspaceService;

    private String currentUserId() {
        UserDetailsImpl user = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    @GetMapping("/workspace/{bookId}")
    public ResponseEntity<IceWorkspace> getWorkspace(@PathVariable String bookId) {
        return ResponseEntity.ok(workspaceService.getOrCreateWorkspace(currentUserId(), bookId));
    }

    @PutMapping("/workspace/{bookId}/manuscript")
    public ResponseEntity<IceWorkspace> updateManuscript(
            @PathVariable String bookId,
            @RequestBody Map<String, String> payload
    ) {
        return ResponseEntity.ok(workspaceService.updateManuscript(
                currentUserId(),
                bookId,
                payload.getOrDefault("manuscriptText", ""),
                payload.getOrDefault("writingMode", "creation")
        ));
    }

    @PostMapping("/workspace/{bookId}/entities")
    public ResponseEntity<IceWorkspace> addEntity(@PathVariable String bookId, @RequestBody StoryBibleEntity entity) {
        return ResponseEntity.ok(workspaceService.addEntity(currentUserId(), bookId, entity));
    }

    @PostMapping("/workspace/{bookId}/feedback")
    public ResponseEntity<IceWorkspace> addFeedback(@PathVariable String bookId, @RequestBody FeedbackInsight insight) {
        return ResponseEntity.ok(workspaceService.addFeedback(currentUserId(), bookId, insight));
    }

    @GetMapping(value = "/workspace/{bookId}/export/{format}", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> export(@PathVariable String bookId, @PathVariable String format) {
        return ResponseEntity.ok(workspaceService.exportPackage(currentUserId(), bookId, format));
    }
}
