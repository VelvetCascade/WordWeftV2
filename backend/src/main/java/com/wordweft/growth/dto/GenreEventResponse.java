package com.wordweft.growth.dto;

import java.time.Instant;
import java.util.List;

public record GenreEventResponse(
        String id,
        String title,
        String genre,
        String prompt,
        String description,
        Instant startAt,
        Instant endAt,
        String timing,
        List<EventStory> stories
) {
    public record EventStory(
            String bookId,
            String title,
            String coverUrl,
            String authorId,
            String authorName
    ) {}
}
