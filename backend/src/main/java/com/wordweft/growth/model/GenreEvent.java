package com.wordweft.growth.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "genre_events")
public class GenreEvent {
    @Id
    private String id;
    private String title;
    private String genre;
    private String prompt;
    private String description;
    private Instant startAt;
    private Instant endAt;
    private String status = "draft";
    private String createdBy;
    private Instant createdAt;
    private List<String> bookIds = new ArrayList<>();
}
