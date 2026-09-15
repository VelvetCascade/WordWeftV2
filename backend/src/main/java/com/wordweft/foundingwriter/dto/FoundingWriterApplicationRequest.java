package com.wordweft.foundingwriter.dto;

import com.wordweft.foundingwriter.model.ExpectedCompletionPeriod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FoundingWriterApplicationRequest {
    private static final String OPTIONAL_WEB_URL = "^$|^https?://\\S+$";

    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name must be 120 characters or fewer")
    private String fullName;

    @Size(max = 120, message = "Pen name must be 120 characters or fewer")
    private String penName;

    @NotBlank(message = "Email address is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 254, message = "Email address is too long")
    private String email;

    @NotBlank(message = "Country is required")
    @Size(max = 120, message = "Country must be 120 characters or fewer")
    private String country;

    @Size(max = 500, message = "Writing profile link is too long")
    @Pattern(regexp = OPTIONAL_WEB_URL, message = "Writing profile must be a valid http or https link")
    private String instagramProfileUrl;

    @NotBlank(message = "Primary genre is required")
    @Size(max = 80, message = "Genre must be 80 characters or fewer")
    private String genre;

    @NotBlank(message = "Story title is required")
    @Size(max = 200, message = "Story title must be 200 characters or fewer")
    private String storyTitle;

    @NotBlank(message = "Story description is required")
    @Size(max = 1000, message = "Story description must be 1,000 characters or fewer")
    private String storyDescription;

    @Size(max = 500, message = "Writing sample link is too long")
    @Pattern(regexp = OPTIONAL_WEB_URL, message = "Writing sample must be a valid http or https link")
    private String writingSampleUrl;

    @Size(max = 3000, message = "Pasted writing sample must be 3,000 characters or fewer")
    private String pastedWritingSample;

    @Size(max = 300, message = "Publishing platform must be 300 characters or fewer")
    private String existingPublishingPlatform;

    @NotNull(message = "Drafted chapter count is required")
    @Min(value = 3, message = "At least three drafted chapters are required")
    @Max(value = 10000, message = "Drafted chapter count is too large")
    private Integer draftedChapterCount;

    @NotNull(message = "Planned chapter count is required")
    @Min(value = 3, message = "Planned chapter count must be at least 3")
    @Max(value = 10000, message = "Planned chapter count is too large")
    private Integer plannedChapterCount;

    @NotNull(message = "Expected completion period is required")
    private ExpectedCompletionPeriod expectedCompletionPeriod;

    @AssertTrue(message = "You must confirm that you are at least 18 years old")
    private boolean ageConfirmed;

    @AssertTrue(message = "You must confirm that you own the work or can publish it")
    private boolean rightsConfirmed;

    @AssertTrue(message = "You must confirm that you intend to complete the story")
    private boolean completionCommitted;

    @AssertTrue(message = "You must confirm the weekly publishing commitment")
    private boolean weeklyPublishingCommitted;

    @AssertTrue(message = "You must acknowledge that readers and earnings are not guaranteed")
    private boolean earningsDisclaimerConfirmed;

    @AssertTrue(message = "You must agree to the Terms and Privacy Policy")
    private boolean termsConfirmed;

    // Honeypot: real applicants never see or fill this field.
    @Size(max = 200)
    private String organizationName;

    @AssertTrue(message = "Confirm that your uploaded file contains at least three chapters")
    private boolean chaptersConfirmed;

    public boolean isHoneypotFilled() {
        return hasText(organizationName);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
