package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FeedbackInsight {
    private String id;
    private String source;
    private String chapterId;
    private String thread;
    private String severity;
    private String summary;
    private String recommendation;
}
