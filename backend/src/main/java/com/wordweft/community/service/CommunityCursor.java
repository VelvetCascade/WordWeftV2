package com.wordweft.community.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import org.springframework.data.mongodb.core.query.Criteria;

public record CommunityCursor(Instant createdAt, String id) {
    public String encode() {
        return Base64.getUrlEncoder().withoutPadding().encodeToString((createdAt + "\n" + id).getBytes(StandardCharsets.UTF_8));
    }
    public static CommunityCursor parse(String input) {
        if (input == null || input.isBlank()) return null;
        try {
            if (input.length() > 512) throw new IllegalArgumentException();
            String[] parts = new String(Base64.getUrlDecoder().decode(input), StandardCharsets.UTF_8).split("\n", -1);
            if (parts.length != 2 || !parts[1].matches("[a-zA-Z0-9_-]{1,100}")) throw new IllegalArgumentException();
            return new CommunityCursor(Instant.parse(parts[0]), parts[1]);
        } catch (RuntimeException ex) { throw new IllegalArgumentException("Invalid page cursor. Refresh the feed."); }
    }
    public Criteria before() {
        return new Criteria().orOperator(Criteria.where("createdAt").lt(createdAt),
                new Criteria().andOperator(Criteria.where("createdAt").is(createdAt), Criteria.where("_id").lt(id)));
    }
    public Criteria after() {
        return new Criteria().orOperator(Criteria.where("createdAt").gt(createdAt),
                new Criteria().andOperator(Criteria.where("createdAt").is(createdAt), Criteria.where("_id").gt(id)));
    }
}
