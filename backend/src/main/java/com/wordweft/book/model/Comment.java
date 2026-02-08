
package com.wordweft.book.model;

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
    private String userId;
    private String bookId;
    private String chapterId;
    private String parentId; // null for top-level comments
    private Integer paragraphIndex; // null if it's a general chapter comment
    private String content;
    private LocalDateTime createdAt = LocalDateTime.now();
}
