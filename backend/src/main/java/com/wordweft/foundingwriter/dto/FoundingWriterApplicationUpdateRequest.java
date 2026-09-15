package com.wordweft.foundingwriter.dto;

import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FoundingWriterApplicationUpdateRequest {
    @NotNull(message = "Status is required")
    private FoundingWriterApplicationStatus status;

    @Size(max = 3000, message = "Admin notes must be 3,000 characters or fewer")
    private String adminNotes;
}
