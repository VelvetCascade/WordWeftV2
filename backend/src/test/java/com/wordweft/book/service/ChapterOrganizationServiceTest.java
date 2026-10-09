package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.mongodb.client.result.UpdateResult;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.AggregationUpdate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ChapterOrganizationServiceTest {
    private final BookRepository books = mock(BookRepository.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final ChapterWriteService writes = mock(ChapterWriteService.class);
    private final ChapterOrganizationService service = new ChapterOrganizationService(books, mongo, writes);
    private Book story(Chapter... chapters) {
        Book book = new Book(); book.setId("book"); book.setAuthorId("author"); book.setChapters(List.of(chapters));
        when(books.findById("book")).thenReturn(Optional.of(book)); return book;
    }
    private Chapter chapter(String id, String status) { Chapter c = new Chapter(); c.setId(id); c.setStatus(status); return c; }
    @Test void duplicateCreatesFreshDraftWithoutReaderProgressOrReleasedSnapshot() {
        Chapter source = chapter("live", "published"); source.setContent("<p>Live text</p>"); source.setPublishedContent("Public text"); source.setTitle("Live"); source.setViewCount(100); source.setLikes(java.util.Set.of("reader"));
        story(source); Chapter copy = service.duplicate("author", "book", "live");
        assertNotEquals(source.getId(), copy.getId()); assertEquals("draft", copy.getStatus()); assertEquals(source.getContent(), copy.getContent());
        assertEquals(0, copy.getViewCount()); assertTrue(copy.getLikes().isEmpty()); assertNull(copy.getPublishedContent()); assertNull(copy.getPublishedAt()); assertNull(copy.getImportBatchId());
        verify(writes).save(any(Book.class), eq(copy), eq(true), eq(0L));
    }
    @Test void releasedAndScheduledPositionsCannotMoveAndInvalidOrdersCannotWrite() {
        story(chapter("live", "published"), chapter("a", "draft"), chapter("b", "draft"), chapter("scheduled", "scheduled"));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.reorder("author", "book", List.of("a", "live", "b", "scheduled"))).getStatusCode().value());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.reorder("author", "book", List.of("live", "scheduled", "b", "a"))).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.reorder("author", "book", List.of("live", "a", "a", "scheduled"))).getStatusCode().value());
        verifyNoInteractions(mongo);
    }
    @Test void draftOrderUsesStoredObjectsRatherThanReplacingTheirConcurrentCounters() {
        story(chapter("live", "published"), chapter("a", "draft"), chapter("b", "draft"));
        when(mongo.updateFirst(any(Query.class), any(AggregationUpdate.class), eq(Book.class))).thenReturn(UpdateResult.acknowledged(1, 1L, null));
        service.reorder("author", "book", List.of("live", "b", "a"));
        verify(mongo).updateFirst(argThat(q -> q.getQueryObject().toString().contains("authorId")), argThat((AggregationUpdate update) -> update.getUpdateObject().toJson().contains("$$chapter")), eq(Book.class));
        verify(books, never()).save(any());
    }
    @Test void anotherWriterCannotDuplicateOrReorder() {
        story(chapter("a", "draft"));
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.duplicate("reader", "book", "a")).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.reorder("reader", "book", List.of("a"))).getStatusCode().value());
        verifyNoInteractions(mongo, writes);
    }
}
