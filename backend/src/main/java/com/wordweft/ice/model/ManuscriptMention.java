package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ManuscriptMention {
    private String id;
    private String chapterId;
    private String entityId;
    private Integer startOffset;
    private Integer endOffset;
    private Double confidence;
    private String contextSnippet;
}
