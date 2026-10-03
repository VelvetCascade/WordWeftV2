package com.wordweft.analytics.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Document(collection = "chapter_read_events")
@CompoundIndex(name = "read_events_book_occurred", def = "{'bookId': 1, 'occurredAt': 1}")
public class ChapterReadEvent {
    @Id
    private String id;
    private String bookId;
    @Indexed
    private String chapterId;
    private String readerKeyHash;
    private String userId;
    private Instant occurredAt;
    private LocalDate readDate;
    private String referrer;

    @Indexed(expireAfter = "0s")
    private Instant expiresAt;
}
