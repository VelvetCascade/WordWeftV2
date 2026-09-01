package com.wordweft.growth.dto;

import java.time.Instant;

public record ReadingChallengeResponse(
        String id,
        String title,
        String description,
        String metric,
        int target,
        int progress,
        int progressPercent,
        boolean joined,
        boolean completed,
        Instant joinedAt
) {}
