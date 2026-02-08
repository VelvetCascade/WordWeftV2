
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@Document(collection = "reviews")
public class Review {
    @Id
    private String id;
    private String bookId;
    private String userId;
    private int rating;
    private String comment;
    private LocalDate date;
    private String sentiment; // "positive", "neutral", "negative"
    
    private List<Reply> replies = new ArrayList<>();
    
    @Data
    @NoArgsConstructor
    public static class Reply {
        private String id = UUID.randomUUID().toString();
        private String userId;
        private String content;
        private LocalDateTime timestamp = LocalDateTime.now();
    }
}
