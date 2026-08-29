package com.wordweft.growth.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "reading_challenge_enrollments")
@CompoundIndex(name = "one_challenge_per_reader", def = "{'userId': 1, 'challengeId': 1}", unique = true)
public class ReadingChallengeEnrollment {
    @Id
    private String id;
    private String userId;
    private String challengeId;
    private int baseline;
    private Instant joinedAt;
    private Instant completedAt;
}
