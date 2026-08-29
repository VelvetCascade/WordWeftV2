
package com.wordweft.notification.service;

import com.wordweft.notification.model.Notification;
import com.wordweft.notification.repository.NotificationRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    // SSE emitter registry: userId -> emitter
    private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    // --- SSE Management ---

    public SseEmitter subscribe(String userId) {
        // 30 minute timeout
        SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> emitters.remove(userId));
        emitter.onTimeout(() -> emitters.remove(userId));
        emitter.onError(e -> emitters.remove(userId));

        // Send initial unread count
        try {
            long count = getUnreadCount(userId);
            emitter.send(SseEmitter.event()
                    .name("unread-count")
                    .data(Map.of("count", count)));
        } catch (IOException e) {
            emitters.remove(userId);
        }

        return emitter;
    }

    private void pushToUser(String userId, Notification notification) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                Map<String, Object> eventData = new HashMap<>();
                eventData.put("id", notification.getId());
                eventData.put("type", notification.getType());
                eventData.put("message", notification.getMessage());
                eventData.put("entityType", notification.getEntityType());
                eventData.put("entityId", notification.getEntityId());
                eventData.put("actorId", notification.getActorId());
                eventData.put("metadata", notification.getMetadata());
                eventData.put("createdAt", notification.getCreatedAt().toString());
                eventData.put("read", false);

                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(eventData));
            } catch (IOException e) {
                emitters.remove(userId);
            }
        }
    }

    // --- Core Notification Creation ---

    public Notification createNotification(String userId, String actorId, String type,
            String entityType, String entityId,
            String message, Map<String, String> metadata) {
        // Don't notify yourself
        if (actorId != null && actorId.equals(userId)) {
            return null;
        }

        // Check user preferences
        if (!isNotificationAllowed(userId, type)) {
            return null;
        }

        // Anti-spam: check for duplicate within last hour
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        List<Notification> recent = notificationRepository
                .findByUserIdAndTypeAndEntityIdAndCreatedAtAfter(userId, type, entityId, oneHourAgo);

        if (!recent.isEmpty()) {
            // Update existing notification instead of creating new
            Notification existing = recent.get(0);
            existing.setMessage(message);
            existing.setRead(false);
            existing.setCreatedAt(Instant.now());
            if (metadata != null) {
                existing.getMetadata().putAll(metadata);
            }
            notificationRepository.save(existing);
            pushToUser(userId, existing);
            return existing;
        }

        Notification notification = new Notification(userId, actorId, type, entityType,
                entityId, message, metadata);
        notificationRepository.save(notification);
        pushToUser(userId, notification);
        return notification;
    }

    // --- Fan-out to Followers ---

    public void notifyFollowers(String actorId, String type, String entityType,
            String entityId, String message, Map<String, String> metadata) {
        Optional<User> actorOpt = userRepository.findById(actorId);
        if (actorOpt.isEmpty())
            return;

        User actor = actorOpt.get();
        Set<String> followers = actor.getFollowers();
        if (followers == null || followers.isEmpty())
            return;

        // Enrich metadata with actor info
        Map<String, String> enrichedMeta = new HashMap<>(metadata != null ? metadata : new HashMap<>());
        enrichedMeta.put("actorName", actor.getUsername());
        enrichedMeta.put("actorAvatar", actor.getAvatarUrl());

        for (String followerId : followers) {
            createNotification(followerId, actorId, type, entityType, entityId, message, enrichedMeta);
        }
    }

    // --- Query Methods ---

    public Page<Notification> getNotifications(String userId, int page, int size, String typeFilter) {
        PageRequest pageable = PageRequest.of(page, size);

        if (typeFilter != null && !typeFilter.isEmpty()) {
            List<String> types = getTypesForFilter(typeFilter);
            return notificationRepository.findByUserIdAndTypeInOrderByCreatedAtDesc(userId, types, pageable);
        }

        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAsRead(String userId, String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    // --- Helpers ---

    private boolean isNotificationAllowed(String userId, String type) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty())
            return false;

        Map<String, Boolean> prefs = userOpt.get().getNotificationPreferences();
        if (prefs == null)
            return true;

        switch (type) {
            case "NEW_FOLLOWER":
                return prefs.getOrDefault("follows", true);
            case "NEW_COMMENT":
            case "COMMENT_REPLY":
            case "COMMUNITY_COMMENT":
            case "COMMUNITY_REPLY":
                return prefs.getOrDefault("comments", true);
            case "AUTHOR_NEW_CHAPTER":
            case "AUTHOR_NEW_STORY":
            case "BOOK_UPDATE":
            case "COMMUNITY_RELEASE":
                return prefs.getOrDefault("storyUpdates", true);
            case "SYSTEM_UPDATE":
                return prefs.getOrDefault("systemAnnouncements", true);
            default:
                return true;
        }
    }

    private List<String> getTypesForFilter(String filter) {
        switch (filter.toUpperCase()) {
            case "SOCIAL":
                return List.of("NEW_FOLLOWER", "NEW_COMMENT", "COMMENT_REPLY", "COMMUNITY_COMMENT", "COMMUNITY_REPLY");
            case "STORIES":
                return List.of("AUTHOR_NEW_CHAPTER", "AUTHOR_NEW_STORY", "BOOK_UPDATE", "COMMUNITY_RELEASE");
            case "SYSTEM":
                return List.of("SYSTEM_UPDATE");
            default:
                return List.of();
        }
    }
}
