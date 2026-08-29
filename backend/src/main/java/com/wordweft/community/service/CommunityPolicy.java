package com.wordweft.community.service;

import com.wordweft.community.dto.CommunityDtos.CreatePostRequest;
import com.wordweft.community.model.CommunityEnums.PostType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class CommunityPolicy {
    public void validatePost(CreatePostRequest request) {
        if (request == null || request.getType() == null) {
            throw new IllegalArgumentException("Choose a post format.");
        }
        if (request.getCircleId() == null || request.getCircleId().isBlank()) {
            throw new IllegalArgumentException("Choose a circle.");
        }
        String body = request.getBody() == null ? "" : request.getBody().trim();
        if (body.isEmpty()) throw new IllegalArgumentException("Write something before publishing.");
        if (body.length() > 5000) throw new IllegalArgumentException("Posts can be at most 5,000 characters.");
        request.setBody(body);

        String title = request.getTitle() == null ? "" : request.getTitle().trim();
        if (Set.of(PostType.RELEASE, PostType.POLL, PostType.WORKSHOP).contains(request.getType()) && title.isEmpty()) {
            throw new IllegalArgumentException("This post format needs a title.");
        }
        if (!title.isEmpty() && (title.length() < 3 || title.length() > 140)) {
            throw new IllegalArgumentException("Titles must be between 3 and 140 characters.");
        }
        request.setTitle(title.isEmpty() ? null : title);
        request.setContentWarnings(normalizeWarnings(request.getContentWarnings()));

        if (request.getType() == PostType.POLL) {
            request.setPollOptions(normalizePollOptions(request.getPollOptions()));
        }
    }

    public List<String> normalizePollOptions(List<String> options) {
        List<String> normalized = new ArrayList<>();
        if (options != null) {
            for (String option : options) {
                String value = option == null ? "" : option.trim();
                if (value.isEmpty() || value.length() > 100) {
                    throw new IllegalArgumentException("Poll choices must be between 1 and 100 characters.");
                }
                normalized.add(value);
            }
        }
        if (normalized.size() < 2 || normalized.size() > 6) {
            throw new IllegalArgumentException("Polls need between 2 and 6 choices.");
        }
        Set<String> unique = new HashSet<>();
        for (String option : normalized) {
            if (!unique.add(option.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("Poll choices must be unique.");
            }
        }
        return normalized;
    }

    public String validateComment(String body) {
        String normalized = body == null ? "" : body.trim();
        if (normalized.isEmpty()) throw new IllegalArgumentException("Write a comment before posting.");
        if (normalized.length() > 2000) throw new IllegalArgumentException("Comments can be at most 2,000 characters.");
        return normalized;
    }

    public List<String> normalizeWarnings(List<String> warnings) {
        if (warnings == null) return List.of();
        Set<String> allowed = Set.of("SPOILERS", "VIOLENCE", "SEXUAL_CONTENT", "STRONG_LANGUAGE", "SENSITIVE_THEMES");
        if (warnings.size() > 5 || warnings.stream().anyMatch(w -> w == null || !allowed.contains(w))) {
            throw new IllegalArgumentException("Choose valid community content warnings.");
        }
        return warnings.stream().distinct().toList();
    }
}
