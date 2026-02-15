package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
public class StoryBibleEntity {
    private String id;
    private String projectId;
    private String type;
    private String name;
    private String summary;
    private List<String> aliases = new ArrayList<>();
    private List<String> traits = new ArrayList<>();
    private List<String> goals = new ArrayList<>();
    private List<String> timelineAnchorIds = new ArrayList<>();
    private List<String> relationshipIds = new ArrayList<>();
    private Map<String, Object> metadata = new HashMap<>();
}
