package com.wordweft.seo;

import com.wordweft.book.model.*;
import com.wordweft.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicSeoServiceTest {
    private Book story() {
        Book book = new Book(); book.setId("book"); book.setAuthorId("author"); book.setTitle("Public title"); book.setPublicationStatus("published");
        Chapter chapter = new Chapter(); chapter.setId("chapter"); chapter.setStatus("published"); chapter.setContent("Public text");
        Chapter draft = new Chapter(); draft.setStatus("draft"); draft.setTitle("PRIVATE"); draft.setContent("SECRET");
        Chapter scheduled = new Chapter(); scheduled.setStatus("scheduled"); scheduled.setContent("FUTURE_SECRET");
        book.setChapters(List.of(chapter, draft, scheduled)); return book;
    }
    @Test void anonymousVisibilityRequiresPublishedBookAndChapterAndEligibleRating() {
        Book book = story(); assertTrue(PublicSeoService.isPublic(book));
        book.setAgeRating(AgeRating.TEEN_13); assertTrue(PublicSeoService.isPublic(book));
        book.setAgeRating(AgeRating.MATURE_18); assertFalse(PublicSeoService.isPublic(book));
        book.setAgeRating(AgeRating.ALL_AGES); book.setMature(true); assertFalse(PublicSeoService.isPublic(book));
        book.setMature(false); book.setPublicationStatus("draft"); assertFalse(PublicSeoService.isPublic(book));
        book.setPublicationStatus("published"); book.setChapters(List.of(new Chapter())); assertFalse(PublicSeoService.isPublic(book));
    }
    @Test void publicProjectionWhitelistsFieldsAndExcludesDraftAndScheduledText() {
        MongoTemplate mongo = mock(MongoTemplate.class); PublicSeoService service = new PublicSeoService(mongo);
        User user = new User(); user.setId("author"); user.setUsername("Writer"); user.setEmail("private@example.com");
        when(mongo.findById("author", User.class)).thenReturn(user);
        Map<String, Object> dto = service.bookDto(story(), true);
        assertFalse(dto.toString().contains("SECRET")); assertFalse(dto.toString().contains("PRIVATE"));
        assertFalse(dto.toString().contains("private@example.com")); assertFalse(dto.containsKey("likes"));
        assertEquals(1, ((List<?>) dto.get("chapters")).size());
        assertFalse(service.bookDto(story(), false).toString().contains("Public text"));
        verify(mongo, never()).save(any(Book.class));
    }
    @Test void directSeoLookupCannotReturnDraftOrRestrictedContent() {
        MongoTemplate mongo = mock(MongoTemplate.class); PublicSeoService service = new PublicSeoService(mongo);
        Book book = story(); book.setPublicationStatus("draft"); when(mongo.findById("book", Book.class)).thenReturn(book);
        assertNull(service.book("book")); book.setPublicationStatus("published"); book.setAgeRating(AgeRating.ADULT_21); assertNull(service.book("book"));
    }
    @Test void sitemapUsesTheActualMongoFieldForEmbeddedChapterIds() {
        MongoMappingContext mapping = new MongoMappingContext();
        mapping.setSimpleTypeHolder(org.springframework.data.mongodb.core.convert.MongoCustomConversions.create(adapter -> {}).getSimpleTypeHolder());
        assertEquals("_id", mapping.getPersistentEntity(Chapter.class).getIdProperty().getFieldName());
        assertEquals("isMature", mapping.getPersistentEntity(Book.class).getPersistentProperty("isMature").getFieldName());
    }
    @Test void invalidAndExcessivePagesFailBeforeQueryingMongo() {
        MongoTemplate mongo = mock(MongoTemplate.class); PublicSeoService service = new PublicSeoService(mongo);
        assertThrows(IllegalArgumentException.class, () -> service.catalog(null, null, null, 0));
        assertThrows(IllegalArgumentException.class, () -> service.sitemap("books", -1));
        assertThrows(IllegalArgumentException.class, () -> service.sitemap("passwords", 1));
        verifyNoInteractions(mongo);
    }
}
