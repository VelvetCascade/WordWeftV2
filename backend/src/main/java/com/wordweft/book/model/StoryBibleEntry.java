package com.wordweft.book.model;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.ArrayList;
import java.util.List;

@Data @NoArgsConstructor
@Document(collection = "story_bible_entries")
public class StoryBibleEntry {
    @Id private String id;
    @NotBlank @Indexed private String bookId;
    @NotBlank @Pattern(regexp = "CHARACTER|MOTIVATION|RELATIONSHIP|SECRET|LORE") private String kind;
    @NotBlank @Size(max = 120) private String title;
    @NotBlank @Size(max = 3000) private String detail;
    @NotBlank @Pattern(regexp = "PUBLIC|PRIVATE") private String visibility = "PRIVATE";
    @Size(max = 100) private String revealChapterId;
    @NotNull @Size(max = 20) private List<@NotBlank @Size(max = 100) String> characterIds = new ArrayList<>();
}
