
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Data
@NoArgsConstructor
@Document(collection = "reading_progress")
@CompoundIndex(name = "user_book_idx", def = "{'userId': 1, 'bookId': 1}", unique = true)
public class ReadingProgress {
    @Id
    private String id;
    private String userId;
    private String bookId;
    private int overallProgress; // 0-100
    private int lastReadChapterIndex;
    private int lastReadScrollPosition;
    private LocalDateTime lastReadTimestamp = LocalDateTime.now();
    
    // Map<ChapterId, ChapterProgressItem>
    private Map<String, ChapterProgressItem> chapters = new HashMap<>();
    
    // Set of chapter IDs that have been fully read and counted towards user stats
    private Set<String> completedChapterIds = new HashSet<>();

    @Data
    @NoArgsConstructor
    public static class ChapterProgressItem {
        private int progress;
        private int scrollPosition;
    }
}
