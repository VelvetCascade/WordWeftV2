package com.wordweft.community.service;

import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;
import java.util.*;

/** Counts are derived in batches, so concurrent writes never lose updates. */
@Component
@RequiredArgsConstructor
public class CommunityCounters {
    private final MongoTemplate mongo;
    public Map<String, Long> count(String collection, String field, Collection<String> ids, Criteria extra) {
        if (ids.isEmpty()) return Map.of();
        Criteria match = Criteria.where(field).in(ids);
        if (extra != null) match = new Criteria().andOperator(match, extra);
        var aggregation = Aggregation.newAggregation(Aggregation.match(match), Aggregation.group(field).count().as("count"));
        Map<String, Long> result = new HashMap<>();
        for (Document row : mongo.aggregate(aggregation, collection, Document.class)) {
            result.put(row.getString("_id"), ((Number) row.get("count")).longValue());
        }
        return result;
    }
}
