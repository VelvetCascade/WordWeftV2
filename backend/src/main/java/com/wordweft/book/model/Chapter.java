
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class Chapter {
    private String id = UUID.randomUUID().toString();
    private String title;
    private int wordCount;
    private String content; 
    private String status = "draft"; // "draft" or "published"
    private List<String> contentWarnings = new ArrayList<>();
    private String disclaimerNote;
    
    // Stats
    private int viewCount = 0;
    private int commentCount = 0;
    private Set<String> likes = new HashSet<>(); // Set of User IDs
    
    public void updateWordCount() {
        if (content != null) {
            this.wordCount = content.split("\\s+").length;
        } else {
            this.wordCount = 0;
        }
    }
}
