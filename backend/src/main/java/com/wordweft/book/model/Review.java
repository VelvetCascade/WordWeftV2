
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

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
}
