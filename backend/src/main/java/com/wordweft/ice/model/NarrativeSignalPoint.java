package com.wordweft.ice.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class NarrativeSignalPoint {
    private String chapterId;
    private String label;
    private Integer value;
}
