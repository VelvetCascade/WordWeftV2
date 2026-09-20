
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
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
    private String status = "draft"; // "draft", "scheduled", or "published"
    private Instant scheduledAt;
    private Instant publishedAt;
    // The writer can keep editing title/content after release without changing
    // what readers see. Null values mean a legacy published chapter and are
    // read through the compatibility projection until first saved/published.
    private String publishedTitle;
    private String publishedContent;
    private Integer publishedWordCount;
    private List<String> publishedContentWarnings;
    private String publishedDisclaimerNote;
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
