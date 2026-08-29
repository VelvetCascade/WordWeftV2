package com.wordweft.report.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "reports")
public class Report {
    @Id
    private String id;
    @Indexed(unique = true)
    private String ticketNumber;
    @Indexed
    private String reporterId;
    private String reporterUsername;
    @NotBlank
    private String targetType;
    @NotBlank
    private String targetId;
    private String targetTitle;
    @Indexed
    private String reportedUserId;
    private String reportedUsername;
    @NotBlank
    private String category;
    @Size(max = 1500)
    private String description;
    @Indexed
    private String status = "PENDING";
    @Indexed
    private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
    private String resolvedBy;
    private String resolutionReason;
    @JsonIgnore
    private String resolutionToken;
}
