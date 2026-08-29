package com.wordweft.community.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;

@Component
@RequiredArgsConstructor
public class CommunityQuota {
    private final MongoTemplate mongo;
    @Data
    @Document(collection = "community_write_quotas")
    public static class Bucket {
        @Id private String id;
        private int used;
        @Indexed(expireAfter = "0s") private Instant expiresAt;
    }
    /** Atomic reservations complement rolling-day counts, including simultaneous create requests. */
    public void reserve(String actorId, String action, int maximum) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        String key = RelationshipId.of(actorId, action, today.toString());
        try {
            mongo.findAndModify(Query.query(Criteria.where("_id").is(key).and("used").lt(maximum)),
                    new Update().inc("used", 1).setOnInsert("expiresAt", today.plusDays(2).atStartOfDay(ZoneOffset.UTC).toInstant()),
                    FindAndModifyOptions.options().upsert(true).returnNew(true), Bucket.class);
        } catch (DuplicateKeyException exhausted) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's community " + action.toLowerCase(java.util.Locale.ROOT) + " limit.");
        }
    }
}
