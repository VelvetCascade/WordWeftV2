package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class StoryRelationship {
    private String id;
    private String sourceEntityId;
    private String targetEntityId;
    private String relationType;
    private String notes;
    private Integer intensity;
}
