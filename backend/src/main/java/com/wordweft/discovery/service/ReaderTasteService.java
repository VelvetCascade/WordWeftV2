package com.wordweft.discovery.service;

import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

@Service
public class ReaderTasteService {
    private static final int MAX_GENRES = 8;

    private final UserRepository users;

    public ReaderTasteService(UserRepository users) {
        this.users = users;
    }

    public List<String> update(String userId, List<String> requestedGenres) {
        User user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        LinkedHashMap<String, String> unique = new LinkedHashMap<>();
        if (requestedGenres != null) {
            for (String genre : requestedGenres) {
                if (genre == null || genre.isBlank()) continue;
                String trimmed = genre.trim();
                if (trimmed.length() > 40) throw new IllegalArgumentException("Genre names must be 40 characters or fewer");
                unique.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
            }
        }
        if (unique.size() > MAX_GENRES) throw new IllegalArgumentException("Choose up to eight genres");

        List<String> normalized = new ArrayList<>(unique.values());
        user.setFavoriteGenres(normalized);
        users.save(user);
        return normalized;
    }
}
