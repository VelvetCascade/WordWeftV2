package com.wordweft.book.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import java.time.Instant;

@Data
@Document(collection = "passageBookmarks")
@CompoundIndexes({
    @CompoundIndex(name = "private_passages_by_book", def = "{'userId':1,'bookId':1}"),
    @CompoundIndex(name = "private_passages_latest_by_book", def = "{'userId':1,'bookId':1,'updatedAt':-1}")
})
public class PassageBookmark {
    @Id private String id;
    private String userId;
    private String bookId;
    private String chapterId;
    private int paragraphIndex;
    private String quote;
    private String note;
    private Instant updatedAt;
}
