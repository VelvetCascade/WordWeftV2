package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "scenes")
public class Scene {
    @Id
    private String id;
    private String bookId;
    private String title;
    private String description;
    private String setting;
    private String time;
    private String chapterId; // Optional link to a chapter
    private List<String> characterIds = new ArrayList<>(); // List of Character IDs involved
}
