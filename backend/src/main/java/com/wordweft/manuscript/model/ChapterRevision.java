package com.wordweft.manuscript.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "chapter_revisions")
@CompoundIndex(name = "chapter_revision_time_idx", def = "{'chapterId': 1, 'createdAt': -1}")
public class ChapterRevision {
    @Id
    private String id;
    private String authorId;
    private String bookId;
    private String chapterId;
    private String title;
    private String content;
    private int wordCount;
    private String reason;
    private String contentHash;
    private String plainTextPreview;
    private Instant createdAt;
}
