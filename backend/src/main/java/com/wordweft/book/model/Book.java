
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@NoArgsConstructor
@Document(collection = "books")
public class Book {
    @Id
    private String id;
    private String title;
    private String authorId; // Reference to User ID
    private String coverUrl;
    private Double rating = 0.0;
    private Integer reviewsCount = 0;

    // Stats
    private Integer viewCount = 0;
    private Integer readCount = 0;
    private Integer readCountLast7Days = 0;
    private Integer viewCountLast7Days = 0;
    private Set<String> likes = new HashSet<>(); // Set of User IDs who liked the book

    private List<String> genres = new ArrayList<>();
    private String category; // Novel, Short Story, Poetry, etc.
    private List<String> tags = new ArrayList<>();
    private String summary;
    private String description;
    private List<Chapter> chapters = new ArrayList<>();
    private String readingStatus = "Ongoing"; // "Completed" or "Ongoing" status of the book's creation
    private String publicationStatus = "draft"; // "draft" or "published"
    private LocalDate publishedDate;
    private LocalDate lastUpdatedAt;
    private LocalDate createdAt;
    private boolean isMature = false;
}
