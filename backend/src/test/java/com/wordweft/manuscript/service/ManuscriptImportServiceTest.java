package com.wordweft.manuscript.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ManuscriptImportServiceTest {
    @Test void importAtomicallyAppendsWithoutOverwritingAnAutosaveThatRacedParsing() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book snapshot = new Book(); snapshot.setId("book"); snapshot.setAuthorId("author");
        Chapter old = new Chapter(); old.setId("existing"); old.setContent("Old snapshot");
        snapshot.setChapters(new ArrayList<>(List.of(old)));
        when(books.findAnalyticsMetadataById("book")).thenReturn(Optional.of(snapshot));
        // The stored document has an autosave and counters newer than the import's snapshot.
        Book current = new Book(); current.setId("book"); current.setAuthorId("author");
        Chapter edited = new Chapter(); edited.setId("existing"); edited.setContent("Autosave that completed while parsing"); edited.setViewCount(12);
        current.setChapters(new ArrayList<>(List.of(edited)));
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Book.class)))
                .thenAnswer(call -> {
                    Update update = call.getArgument(1);
                    Document push = (Document) update.getUpdateObject().get("$push");
                    Update.Modifiers modifiers = (Update.Modifiers) push.get("chapters");
                    Object[] each = (Object[]) modifiers.getModifiers().stream().filter(modifier -> "$each".equals(modifier.getKey())).findFirst().orElseThrow().getValue();
                    List<Chapter> imported = java.util.Arrays.stream(each).map(value -> (Chapter)value).toList();
                    current.getChapters().addAll(imported); return current;
                });
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        ManuscriptImportService.ImportResult result = service.importManuscript("author", "book", "story.md", "# Chapter One\nOpening text".getBytes(StandardCharsets.UTF_8));
        assertEquals(1, result.importedChapters()); assertEquals(2, result.totalChapters());
        assertEquals(1, snapshot.getChapters().size(), "Import must not mutate or replace its stale chapter snapshot");
        assertEquals("Autosave that completed while parsing", current.getChapters().get(0).getContent());
        assertEquals(12, current.getChapters().get(0).getViewCount());
        assertEquals("draft", current.getChapters().get(1).getStatus());
        assertEquals(1, snapshot.getChapters().size());
        verify(books, never()).save(any());
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).findAndModify(query.capture(), update.capture(), any(FindAndModifyOptions.class), eq(Book.class));
        assertEquals("book", query.getValue().getQueryObject().get("_id"));
        assertEquals("author", query.getValue().getQueryObject().get("authorId"));
        assertFalse(((Document)update.getValue().getUpdateObject().get("$set")).containsKey("chapters"));
        verify(mongo).updateFirst(argThat(q -> q.getQueryObject().containsKey("chapters") && q.getQueryObject().get("chapters") == null), any(Update.class), eq(Book.class));
    }
    @Test void importRejectsAnotherWritersStoryBeforeAnyDatabaseMutation() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author");
        when(books.findAnalyticsMetadataById("book")).thenReturn(Optional.of(book));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.importManuscript("intruder", "book", "story.txt", "text".getBytes(StandardCharsets.UTF_8)));
        assertEquals(403, error.getStatusCode().value()); verifyNoInteractions(mongo);
    }
    @Test void storyRemovedDuringParsingIsNotResurrectedByTheImport() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author");
        when(books.findAnalyticsMetadataById("book")).thenReturn(Optional.of(book));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.importManuscript("author", "book", "story.txt", "text".getBytes(StandardCharsets.UTF_8)));
        assertEquals(409, error.getStatusCode().value()); verify(books, never()).save(any());
    }
    @Test void preflightReturnsSemanticCountsWithoutChangingTheStory() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author");
        when(books.findAnalyticsMetadataById("book")).thenReturn(Optional.of(book));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        var preview = service.preflight("author", "book", "story.md", "# Chapter One\nOpening text".getBytes(StandardCharsets.UTF_8));
        assertEquals(1, preview.chapters().size()); assertEquals(2, preview.totalWords());
        verifyNoInteractions(mongo); verify(books, never()).save(any());
    }
    @Test void undoCannotDeleteAReleasedOrEditedImportedChapter() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author");
        Chapter chapter = new Chapter(); chapter.setImportBatchId("batch"); chapter.setStatus("published"); book.setChapters(List.of(chapter));
        when(books.findById("book")).thenReturn(Optional.of(book));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.undo("author", "book", "batch")).getStatusCode().value());
        chapter.setStatus("draft"); chapter.setEditRevision(1);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.undo("author", "book", "batch")).getStatusCode().value());
        chapter.setEditRevision(0); chapter.setPublishedContent("Released once");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.undo("author", "book", "batch")).getStatusCode().value());
        verifyNoInteractions(mongo);
    }
    @Test void undoAtomicallyGuardsOnlyItsNewDraftBatch() {
        BookRepository books = mock(BookRepository.class); MongoTemplate mongo = mock(MongoTemplate.class);
        Book book = new Book(); book.setId("book"); book.setAuthorId("author");
        Chapter live = new Chapter(); live.setId("live"); live.setStatus("published");
        Chapter imported = new Chapter(); imported.setId("new"); imported.setImportBatchId("batch"); imported.setContent("New text"); book.setChapters(List.of(live, imported));
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(Book.class))).thenReturn(com.mongodb.client.result.UpdateResult.acknowledged(1, 1L, null));
        ManuscriptImportService service = new ManuscriptImportService(books, new ManuscriptParser(), mongo);
        assertEquals(1, service.undo("author", "book", "batch"));
        verify(mongo).updateFirst(argThat(q -> q.getQueryObject().toJson().contains("publishedContent") && q.getQueryObject().toJson().contains("editRevision")),
                argThat(u -> u.getUpdateObject().toJson().contains("batch") && !u.getUpdateObject().toJson().contains("live")), eq(Book.class));
    }
    @Test void springContextCanInstantiateManuscriptImportService() {
        org.springframework.context.support.GenericApplicationContext context = new org.springframework.context.support.GenericApplicationContext();
        context.registerBean(BookRepository.class, () -> mock(BookRepository.class));
        context.registerBean(MongoTemplate.class, () -> mock(MongoTemplate.class));
        context.registerBean(ManuscriptParser.class, ManuscriptParser::new);
        context.registerBean(ManuscriptImportService.class);
        context.refresh(); assertNotNull(context.getBean(ManuscriptImportService.class)); context.close();
    }
}
