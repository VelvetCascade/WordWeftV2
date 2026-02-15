
package com.wordweft.book.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@Document(collection = "library")
@CompoundIndex(name = "user_book_lib_idx", def = "{'userId': 1, 'bookId': 1}", unique = true)
public class LibraryEntry {
    @Id
    private String id;
    private String userId;
    private String bookId;
    @Deprecated
    private String shelfName = "My List"; // Default shelf

    // Store IDs of shelves this book belongs to
    private Set<String> shelfIds = new HashSet<>();

    private LocalDate addedDate;
}
