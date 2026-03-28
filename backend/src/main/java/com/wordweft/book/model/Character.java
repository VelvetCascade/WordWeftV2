package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

@Data
@NoArgsConstructor
@Document(collection = "characters")
public class Character {
    @Id
    private String id;
    private String bookId;
    
    @NotBlank(message = "Character name is required")
    @Size(max = 100, message = "Name must be less than 100 characters")
    private String name;
    
    @Size(max = 50)
    private String role; // e.g., Protagonist, Antagonist, Supporting
    
    @Size(max = 2000)
    private String description;
    
    @Size(max = 1000)
    private String goal;
    
    @Pattern(regexp = "^(https?://).*|", message = "Image URL must be a valid URL")
    private String imageUrl;
    private String imageFileId;
}
