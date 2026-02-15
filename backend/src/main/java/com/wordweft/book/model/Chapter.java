package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
public class Chapter {
    private String id = UUID.randomUUID().toString();
    private String title;
    private int wordCount;
    private String content;
    private String contentJson;
    private String status = "draft"; // publication status: "draft" or "published"
    private String workflowStatus = "Draft"; // Draft / Edit / Done
    private String povCharacter;
    private Integer sortOrder = 0;
    private List<String> scrapyardSnippets = new ArrayList<>();

    // Stats
    private int viewCount = 0;
    private int commentCount = 0;
    private Set<String> likes = new HashSet<>();

    public void updateWordCount() {
        if (content != null && !content.isBlank()) {
            this.wordCount = content.trim().split("\\s+").length;
        } else {
            this.wordCount = 0;
        }
    }
}
