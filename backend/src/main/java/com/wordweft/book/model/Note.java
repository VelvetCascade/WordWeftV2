package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@Document(collection = "notes")
public class Note {
    @Id
    private String id;
    private String bookId;
    private String chapterId; // Optional, can be null if note is for the whole book
    
    @NotBlank(message = "Note title is required")
    @Size(max = 100, message = "Title must be less than 100 characters")
    private String title;
    
    @Size(max = 10000)
    private String content;
}
