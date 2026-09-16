package com.wordweft.foundingwriter.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "founding_writer_applications")
public class FoundingWriterApplication {
    @Id
    private String id;

    private String fullName;
    private String penName;

    @Indexed(unique = true)
    private String email;

    private String country;
    private String instagramProfileUrl;
    private String genre;
    private String storyTitle;
    private String storyDescription;
    private String writingSampleUrl;
    private String pastedWritingSample;
    private String chapterFileName;
    private String chapterFileContentType;
    private long chapterFileSize;
    private String r2FileKey;
    private boolean fileUploaded;
    private boolean chaptersConfirmed;
    private String existingPublishingPlatform;
    private int draftedChapterCount;
    private int plannedChapterCount;
    private ExpectedCompletionPeriod expectedCompletionPeriod;
    private boolean ageConfirmed;
    private boolean rightsConfirmed;
    private boolean completionCommitted;
    private boolean weeklyPublishingCommitted;
    private boolean earningsDisclaimerConfirmed;
    private boolean termsConfirmed;

    @Indexed
    private FoundingWriterApplicationStatus status = FoundingWriterApplicationStatus.PENDING;

    private String adminNotes;

    @Indexed
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
