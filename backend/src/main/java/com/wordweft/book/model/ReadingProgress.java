
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.HashMap;
import java.util.Map;

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
    
    // Map<ChapterId, ChapterProgress>
    private Map<String, ChapterProgressItem> chapters = new HashMap<>();

    @Data
    @NoArgsConstructor
    public static class ChapterProgressItem {
        private int progress;
        private int scrollPosition;
    }
}
