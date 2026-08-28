package com.wordweft.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReportRequest {
    @NotBlank
    @Pattern(regexp = "BOOK|CHAPTER|COMMENT|USER")
    private String targetType;
    @NotBlank
    private String targetId;
    @NotBlank
    @Pattern(regexp = "SPAM|HARASSMENT|PLAGIARISM|SEXUAL_CONTENT|HATE_SPEECH|VIOLENCE|COPYRIGHT|MISINFORMATION|OTHER")
    private String category;
    @Size(max = 1500)
    private String description;
}
