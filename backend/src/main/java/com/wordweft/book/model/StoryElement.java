package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "story_elements")
public class StoryElement {
    @Id
    private String id;
    private String name;
    private StoryElementCategory category = StoryElementCategory.CHARACTER;
    private String description;
    private String imageUrl;
    private String bookId;
}
