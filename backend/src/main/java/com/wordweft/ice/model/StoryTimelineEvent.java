package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class StoryTimelineEvent {
    private String id;
    private String label;
    private String summary;
    private List<String> chapterIds = new ArrayList<>();
    private Integer sequence;
}
