package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@Document(collection = "scenes")
public class Scene {
    @Id
    private String id;
    private String bookId;
    
    @NotBlank(message = "Scene title is required")
    @Size(max = 100, message = "Title must be less than 100 characters")
    private String title;
    
    @Size(max = 2000)
    private String description;
    
    @Size(max = 200)
    private String setting;
    
    @Size(max = 200)
    private String time;
    
    private String chapterId; // Optional link to a chapter
    private List<String> characterIds = new ArrayList<>(); // List of Character IDs involved
}
