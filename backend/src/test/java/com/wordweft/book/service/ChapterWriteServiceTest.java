package com.wordweft.book.service;

import com.mongodb.client.result.UpdateResult;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ChapterWriteServiceTest {
    @Test void staleClientRevisionCannotReplaceNewerDraftAndLegacyContractRemainsOptional() {
        Chapter chapter = new Chapter(); chapter.setEditRevision(4); chapter.setContent("Newer server draft");
        var failure = assertThrows(ResponseStatusException.class, () -> ChapterWriteService.requireRevision(chapter, 3L));
        assertEquals(409, failure.getStatusCode().value());
        assertEquals("Newer server draft", chapter.getContent());
        assertDoesNotThrow(() -> ChapterWriteService.requireRevision(chapter, null));
        assertDoesNotThrow(() -> ChapterWriteService.requireRevision(chapter, 4L));
    }
    @Test void concurrentSaveBetweenReadAndWriteIsRejectedAtomicallyWithoutReplacingCounters() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(Book.class)))
                .thenReturn(UpdateResult.acknowledged(0, 0L, null));
        Chapter chapter = new Chapter(); chapter.setId("chapter"); chapter.setEditRevision(2); chapter.setContent("My draft");
        Book book = new Book(); book.setId("book"); book.setAuthorId("owner");
        var error = assertThrows(ResponseStatusException.class, () -> new ChapterWriteService(mongo).save(book, chapter, false, 1));
        assertEquals(409, error.getStatusCode().value());
        verify(mongo).updateFirst(argThat(query -> query.getQueryObject().toJson().contains("editRevision")),
                argThat(update -> !update.getUpdateObject().toJson().contains("viewCount")
                        && !update.getUpdateObject().toJson().contains("likes")), eq(Book.class));
    }
    @Test void missingLegacyRevisionIsAcceptedOnlyAsRevisionZero() {
        MongoTemplate mongo = mock(MongoTemplate.class);
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(Book.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));
        Book book = new Book(); book.setId("book"); book.setAuthorId("owner");
        Chapter chapter = new Chapter(); chapter.setEditRevision(1);
        new ChapterWriteService(mongo).save(book, chapter, false, 0);
        verify(mongo).updateFirst(argThat(query -> query.getQueryObject().toJson().contains("$exists")), any(Update.class), eq(Book.class));
    }
}
