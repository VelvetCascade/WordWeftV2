package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "characters")
public class Character {
    @Id
    private String id;
    private String bookId;
    private String name;
    private String role; // e.g., Protagonist, Antagonist, Supporting
    private String description;
    private String goal;
    private String imageUrl;
}
