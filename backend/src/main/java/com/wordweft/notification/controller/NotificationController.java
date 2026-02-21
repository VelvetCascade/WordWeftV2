
package com.wordweft.notification.controller;

import com.wordweft.notification.model.Notification;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type) {

        String userId = getCurrentUserId();
        if (userId == null)
            return ResponseEntity.status(401).build();

        Page<Notification> notifications = notificationService.getNotifications(userId, page, size, type);

        Map<String, Object> response = new HashMap<>();
        response.put("notifications", notifications.getContent().stream()
                .map(this::toMap).collect(Collectors.toList()));
        response.put("totalPages", notifications.getTotalPages());
        response.put("totalElements", notifications.getTotalElements());
        response.put("currentPage", page);
        response.put("hasNext", notifications.hasNext());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        String userId = getCurrentUserId();
        if (userId == null)
            return ResponseEntity.status(401).build();

        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable String id) {
        String userId = getCurrentUserId();
        if (userId == null)
            return ResponseEntity.status(401).build();

        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        String userId = getCurrentUserId();
        if (userId == null)
            return ResponseEntity.status(401).build();

        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> toMap(Notification n) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", n.getId());
        map.put("userId", n.getUserId());
        map.put("actorId", n.getActorId());
        map.put("type", n.getType());
        map.put("entityType", n.getEntityType());
        map.put("entityId", n.getEntityId());
        map.put("message", n.getMessage());
        map.put("read", n.isRead());
        map.put("createdAt", n.getCreatedAt().toString());
        map.put("metadata", n.getMetadata());
        return map;
    }
}
