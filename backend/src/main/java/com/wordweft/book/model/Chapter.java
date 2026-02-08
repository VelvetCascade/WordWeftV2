
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
public class Chapter {
    private String id = UUID.randomUUID().toString();
    private String title;
    private int wordCount;
    private String content; // Storing content here for simplicity, in a real app this might be separate
    private String status = "draft"; // "draft" or "published"
    private int viewCount = 0;
    private int likeCount = 0;
    private int commentCount = 0;

    public void updateWordCount() {
        if (content != null) {
            this.wordCount = content.split("\\s+").length;
        } else {
            this.wordCount = 0;
        }
    }
}
