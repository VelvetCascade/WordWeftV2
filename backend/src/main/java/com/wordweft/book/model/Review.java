
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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

@Data
@NoArgsConstructor
@Document(collection = "reviews")
public class Review {
    @Id
    private String id;
    private String bookId;
    private String userId;
    
    @Min(1)
    @Max(5)
    private int rating;
    
    @NotBlank(message = "Review comment cannot be empty")
    @Size(max = 5000, message = "Review is too long")
    private String comment;
    
    private LocalDate date;
    private String sentiment; // "positive", "neutral", "negative"
    
    private List<Reply> replies = new ArrayList<>();
    
    @Data
    @NoArgsConstructor
    public static class Reply {
        private String id = UUID.randomUUID().toString();
        private String userId;
        
        @NotBlank(message = "Reply content cannot be empty")
        @Size(max = 2000, message = "Reply is too long")
        private String content;
        
        private LocalDateTime timestamp = LocalDateTime.now();
    }
}
