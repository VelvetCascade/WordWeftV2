package com.wordweft.comment.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Document(collection = "comments")
public class Comment {
    @Id
    private String id;
    private String content;
    private String userId;
    private String bookId;
    private String chapterId;

    // Nullable: if null, it's a chapter-level comment.
    // If set, it's an inline comment on that paragraph index.
    private Integer paragraphIndex;

    private LocalDateTime createdAt = LocalDateTime.now();

    // Optional: for future threading
    // private String parentCommentId;
}
