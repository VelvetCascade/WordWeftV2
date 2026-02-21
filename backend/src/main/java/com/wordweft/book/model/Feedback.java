
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@Document(collection = "feedback")
public class Feedback {
    @Id
    private String id;

    // Optional — null if anonymous
    private String userId;
    private String sessionId;

    // Context fields for contextual feedback
    private String feedbackType; // FIRST_EXPERIENCE, PUBLISH_FLOW, READING_EXPERIENCE, COMMENT_SYSTEM,
                                 // GENERAL_FEEDBACK, EXIT_FEEDBACK, POWER_USER, FULL_FORM
    private Integer rating; // quick 1-3 rating from toasts
    private String shortResponse; // one-liner from exit intent or toast follow-up
    private String longResponse; // detailed text from modal
    private Map<String, Object> contextData = new HashMap<>(); // arbitrary context JSON
    private String page; // which page the feedback was triggered from
    private String feature; // which feature triggered it
    private String appVersion;

    // Full form fields (from FeedbackPage)
    private String userType; // "writer", "reader", "both"
    private Integer overallRating; // 1-5

    private List<String> triedFeatures = new ArrayList<>(); // checkboxes
    private String otherTriedFeature; // "Other" text

    private String whatFeltGood;
    private String whatWasFrustrating;

    private List<String> missingFeatures = new ArrayList<>(); // tag-style input

    private String performanceIssue; // "no", "sometimes", "often", "very_often"
    private String performanceDetails; // optional text

    private String usageFrequency; // "daily", "few_times_week", "occasionally", "probably_not"
    private String usageFrequencyWhy; // optional text

    private String openThoughts;

    private boolean contactPermission = false;
    private String contactEmail;

    private String userTag; // "alpha" or "beta"
    private Instant submittedAt;
}
