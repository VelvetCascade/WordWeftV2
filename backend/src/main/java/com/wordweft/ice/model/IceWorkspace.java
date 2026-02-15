package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "ice_workspaces")
public class IceWorkspace {
    @Id
    private String id;
    private String ownerUserId;
    private String bookId;
    private String writingMode = "creation";
    private String manuscriptText = "";
    private List<StoryBibleEntity> entities = new ArrayList<>();
    private List<StoryRelationship> relationships = new ArrayList<>();
    private List<StoryTimelineEvent> timelineEvents = new ArrayList<>();
    private List<NarrativeSignalPoint> narrativeSignals = new ArrayList<>();
    private List<FeedbackInsight> feedbackInsights = new ArrayList<>();
    private List<ManuscriptMention> mentions = new ArrayList<>();
    private Instant updatedAt = Instant.now();
}
