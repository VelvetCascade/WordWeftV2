
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

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
    
    @NotBlank(message = "Comment content cannot be empty")
    @Size(max = 2000, message = "Comment is too long")
    private String content;
    
    private LocalDateTime createdAt = LocalDateTime.now();
}
