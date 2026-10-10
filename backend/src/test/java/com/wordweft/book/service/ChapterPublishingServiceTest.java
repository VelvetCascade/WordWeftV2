package com.wordweft.book.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.notification.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChapterPublishingServiceTest {
    private static final Instant NOW = Instant.parse("2026-08-29T10:00:00Z");

    @Mock BookRepository books;
    @Mock NotificationService notifications;

    private ChapterPublishingService service;
    private Book book;
    private Chapter chapter;

    @BeforeEach
    void setUp() {
        service = new ChapterPublishingService(books, notifications, Clock.fixed(NOW, ZoneOffset.UTC));
        chapter = new Chapter();
        chapter.setId("chapter-1");
        chapter.setTitle("The Return");
        chapter.setContent("A complete chapter ready for readers.");
        chapter.updateWordCount();

        book = new Book();
        book.setId("book-1");
        book.setTitle("North Star");
        book.setAuthorId("author-1");
        book.setPublicationStatus("published");
        book.setChapters(List.of(chapter));

        lenient().when(books.findById("book-1")).thenReturn(Optional.of(book));
        lenient().when(books.save(any(Book.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void scheduleValidatesMatureAuthorEligibilityBeforeAcceptingTheRelease() {
        var users = mock(com.wordweft.user.repository.UserRepository.class);
        var author = new com.wordweft.user.model.User(); author.setId("author-1"); author.setDateOfBirth(java.time.LocalDate.of(2015, 1, 1)); author.setAllowMatureContent(false);
        when(users.findById("author-1")).thenReturn(Optional.of(author));
        org.springframework.test.util.ReflectionTestUtils.setField(service, "userRepository", users);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "contentAccessService", new ContentAccessService());
        chapter.setContentWarnings(List.of("GORE"));
        assertThrows(ResponseStatusException.class, () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        assertEquals("draft", chapter.getStatus()); assertNull(chapter.getScheduledAt()); assertEquals(com.wordweft.book.model.AgeRating.ALL_AGES, book.getAgeRating());
        verify(books, never()).save(any());
        author.setDateOfBirth(java.time.LocalDate.of(1990, 1, 1));
        service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600));
        assertEquals("scheduled", chapter.getStatus()); assertEquals(com.wordweft.book.model.AgeRating.ALL_AGES, book.getAgeRating());
    }

    @Test
    void schedulingRejectsMarkupContainingOnlyNonbreakingSpaces() {
        chapter.setContent("<p>&nbsp;<br>&#160;</p>");
        assertThrows(ResponseStatusException.class, () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        verify(books, never()).save(any());
    }

    @Test
    void scheduleStoresTheUtcInstantAndScheduledStatus() {
        Instant release = NOW.plus(2, ChronoUnit.HOURS);

        service.schedule("author-1", "book-1", "chapter-1", release);

        assertEquals("scheduled", chapter.getStatus());
        assertEquals(release, chapter.getScheduledAt());
        assertNull(chapter.getPublishedAt());
    }

    @Test
    void scheduleRejectsAReleaseLessThanTwoMinutesAway() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(119)));

        assertEquals(400, error.getStatusCode().value());
        assertEquals("Choose a release time at least two minutes from now.", error.getReason());
        assertEquals("draft", chapter.getStatus());
    }

    @Test
    void scheduleRejectsAnotherWritersStory() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.schedule("other-author", "book-1", "chapter-1", NOW.plusSeconds(600)));

        assertEquals(403, error.getStatusCode().value());
        assertEquals("You do not have permission to manage this story.", error.getReason());
    }

    @Test
    void scheduleRequiresACompleteChapterAndPublishedStory() {
        chapter.setContent("   ");

        ResponseStatusException emptyChapter = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        assertEquals("Add a chapter title and content before scheduling it.", emptyChapter.getReason());

        chapter.setContent("Ready again");
        book.setPublicationStatus("draft");
        ResponseStatusException draftStory = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));
        assertEquals("Publish the story before scheduling a chapter.", draftStory.getReason());
    }

    @Test
    void cancelScheduleReturnsTheChapterToDraft() {
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.plusSeconds(600));

        service.cancelSchedule("author-1", "book-1", "chapter-1");

        assertEquals("draft", chapter.getStatus());
        assertNull(chapter.getScheduledAt());
    }

    @Test
    void publishNowClearsTheScheduleAndDoesNotNotifyTwice() {
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.plusSeconds(600));

        service.publishNow("author-1", "book-1", "chapter-1");
        service.publishNow("author-1", "book-1", "chapter-1");

        assertEquals("published", chapter.getStatus());
        assertNull(chapter.getScheduledAt());
        assertEquals(NOW, chapter.getPublishedAt());
        assertEquals("The Return", chapter.getPublishedTitle());
        assertEquals("A complete chapter ready for readers.", chapter.getPublishedContent());
        verify(notifications, times(1)).notifyFollowers(
                eq("author-1"), eq("AUTHOR_NEW_CHAPTER"), eq("CHAPTER"), eq("chapter-1"),
                contains("The Return"), argThat(metadata -> "North Star".equals(metadata.get("bookTitle"))));
    }

    @Test
    void publishingAChapterPublishesItsDraftStoryAtTheSameTime() {
        book.setPublicationStatus("draft");

        service.publishNow("author-1", "book-1", "chapter-1");

        assertEquals("published", book.getPublicationStatus());
        assertEquals("published", chapter.getStatus());
        assertEquals(NOW, chapter.getPublishedAt());
        assertNotNull(book.getPublishedDate());
    }

    @Test
    void scheduleOnlyAllowsTheNextUnpublishedChapter() {
        Chapter first = new Chapter();
        first.setId("chapter-0");
        first.setTitle("First");
        first.setContent("First text");
        Chapter third = new Chapter();
        third.setId("chapter-3");
        third.setTitle("Third");
        third.setContent("Third text");
        book.setChapters(List.of(first, chapter, third));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.schedule("author-1", "book-1", "chapter-1", NOW.plusSeconds(600)));

        assertEquals("Publish or schedule the preceding chapter first.", error.getReason());
        assertEquals("draft", chapter.getStatus());
    }

    @Test
    void publishingARevisionRefreshesSnapshotWithoutSecondFollowerNotification() {
        chapter.setStatus("published");
        chapter.setPublishedAt(NOW.minusSeconds(300));
        chapter.setPublishedTitle("Old title");
        chapter.setPublishedContent("Old public copy");
        chapter.setTitle("Revised title");
        chapter.setContent("Revised public copy");
        chapter.updateWordCount();

        service.publishNow("author-1", "book-1", "chapter-1");

        assertEquals("Revised title", chapter.getPublishedTitle());
        assertEquals("Revised public copy", chapter.getPublishedContent());
        verifyNoInteractions(notifications);
    }

    @Test
    void publishingLaterChapterAlsoPublishesCompletePrecedingDrafts() {
        Chapter first = new Chapter();
        first.setId("chapter-0");
        first.setTitle("Before");
        first.setContent("The first chapter.");
        first.updateWordCount();
        book.setPublicationStatus("draft");
        book.setChapters(List.of(first, chapter));

        service.publishNow("author-1", "book-1", "chapter-1");

        assertEquals("published", first.getStatus());
        assertEquals("published", chapter.getStatus());
        assertEquals("published", book.getPublicationStatus());
    }

    @Test
    void unpublishingAChapterAlsoUnpublishesEveryLaterChapter() {
        Chapter later = new Chapter();
        later.setId("chapter-2");
        later.setTitle("Later");
        later.setContent("Later text");
        later.setStatus("published");
        later.setPublishedAt(NOW.minusSeconds(30));
        chapter.setStatus("published");
        chapter.setPublishedAt(NOW.minusSeconds(60));
        book.setChapters(List.of(chapter, later));

        service.unpublishChapter("author-1", "book-1", "chapter-1");

        assertEquals("draft", chapter.getStatus());
        assertEquals("draft", later.getStatus());
        assertNull(chapter.getPublishedAt());
        assertNull(later.getPublishedAt());
    }

    @Test
    void publishDueTransitionsOnlyChaptersWhoseTimeHasArrived() {
        Chapter later = new Chapter();
        later.setId("chapter-2");
        later.setTitle("Later");
        later.setContent("Not yet");
        later.setStatus("scheduled");
        later.setScheduledAt(NOW.plusSeconds(60));
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.minusSeconds(1));
        book.setChapters(List.of(chapter, later));

        boolean changed = service.publishDue(book, NOW);

        assertTrue(changed);
        assertEquals("published", chapter.getStatus());
        assertEquals("scheduled", later.getStatus());
        verify(notifications, times(1)).notifyFollowers(anyString(), anyString(), anyString(), anyString(), anyString(), anyMap());
    }

    @Test
    void schedulerDoesNothingAfterStoryReturnsToDraft() {
        chapter.setStatus("scheduled");
        chapter.setScheduledAt(NOW.minusSeconds(1));
        book.setPublicationStatus("draft");

        assertFalse(service.publishDue(book, NOW));
        assertEquals("scheduled", chapter.getStatus());
        verifyNoInteractions(notifications);
    }
    @Test
    void impactIncludesEarlierDraftsSchedulesWarningsAndPrivateStory() {
        Chapter earlier = new Chapter();
        earlier.setId("earlier"); earlier.setTitle("Earlier"); earlier.setContent("Earlier text");
        earlier.setStatus("scheduled"); earlier.setScheduledAt(NOW.plusSeconds(3600));
        earlier.setContentWarnings(List.of("GORE"));
        book.setPublicationStatus("draft"); book.setChapters(List.of(earlier, chapter));
        var impact = service.reviewPublication("author-1", "book-1", "chapter-1");
        assertTrue(impact.storyBecomesPublic());
        assertEquals(List.of("earlier", "chapter-1"), impact.chapters().stream().map(c -> c.id()).toList());
        assertEquals(NOW.plusSeconds(3600), impact.chapters().get(0).scheduledAt());
        assertEquals(List.of("GORE"), impact.chapters().get(0).contentWarnings());
        assertEquals("MATURE_18", impact.resultingAgeRating());
    }

    @Test
    void stalePublicationReviewRejectsBeforeAnyChapterGoesLive() {
        var impact = service.reviewPublication("author-1", "book-1", "chapter-1");
        chapter.setContent("Changed after reviewing");
        var error = assertThrows(ResponseStatusException.class, () ->
            service.publishReviewed("author-1", "book-1", "chapter-1", impact.reviewToken()));
        assertEquals(409, error.getStatusCode().value());
        assertEquals("draft", chapter.getStatus());
        verify(books, never()).save(any());
        verifyNoInteractions(notifications);
    }

    @Test
    void approvedReviewKeepsOrderedReleaseSemanticsAndClearsEarlierSchedule() {
        Chapter earlier = new Chapter();
        earlier.setId("earlier"); earlier.setTitle("Earlier"); earlier.setContent("Earlier text");
        earlier.setStatus("scheduled"); earlier.setScheduledAt(NOW.plusSeconds(3600));
        book.setChapters(List.of(earlier, chapter));
        var impact = service.reviewPublication("author-1", "book-1", "chapter-1");
        service.publishReviewed("author-1", "book-1", "chapter-1", impact.reviewToken());
        assertEquals("published", earlier.getStatus()); assertNull(earlier.getScheduledAt());
        assertEquals("published", chapter.getStatus());
    }

    @Test
    void comparisonUsesLiveSnapshotNotLatestBackupOrEditedDraft() {
        chapter.setStatus("published"); PublishedChapterView.capture(chapter);
        chapter.setContent("Private revised manuscript."); chapter.setTitle("Private title");
        chapter.setContentWarnings(List.of("GRIEF")); chapter.setDisclaimerNote("Private note");
        var comparison = service.compare("author-1", "book-1", "chapter-1", null, null, false);
        assertTrue(comparison.live());
        assertEquals("The Return", comparison.baseline().title());
        assertEquals("A complete chapter ready for readers.", comparison.baseline().content());
        assertEquals("Private revised manuscript.", comparison.draft().content());
        assertEquals(List.of("GRIEF"), comparison.draft().contentWarnings());
        verify(books, never()).save(any());
    }

    @Test
    void legacyPublishedComparisonAndNewChapterBaselineAreHonest() {
        var fresh = service.compare("author-1", "book-1", "chapter-1", null, null, false);
        assertNull(fresh.baseline()); assertFalse(fresh.live());
        chapter.setStatus("published");
        var legacy = service.compare("author-1", "book-1", "chapter-1", null, null, false);
        assertEquals(chapter.getContent(), legacy.baseline().content());
        assertEquals("UNCHANGED", service.reviewPublication("author-1", "book-1", "chapter-1").chapters().get(0).changeType());
        chapter.setStatus("draft"); PublishedChapterView.capture(chapter);
        assertFalse(service.compare("author-1", "book-1", "chapter-1", null, null, false).live());
        assertNotNull(service.compare("author-1", "book-1", "chapter-1", null, null, false).baseline());
    }

    @Test
    void ordinaryChapterReleaseKeepsOtherPublishedEditsPrivateAndDisclosesThem() {
        Chapter earlier = releasedChapter("earlier", "Original earlier"); earlier.setContent("Private earlier update");
        book.setChapters(List.of(earlier, chapter));
        var impact = service.reviewPublication("author-1", "book-1", "chapter-1");
        assertEquals(1, impact.privateUpdatesRemaining());
        assertEquals(List.of("chapter-1"), impact.chapters().stream().map(c -> c.id()).toList());
        service.publishReviewed("author-1", "book-1", "chapter-1", impact.reviewToken());
        assertEquals("Original earlier", PublishedChapterView.of(earlier).content());
        assertEquals("NEW", impact.chapters().get(0).changeType());
    }

    @Test
    void storyReleaseReviewsAndPublishesAllEarlierUpdatesButLeavesLaterChaptersAndUnchangedReleasesAlone() {
        Chapter earlier = releasedChapter("earlier", "Original earlier"); earlier.setContent("Private earlier update");
        Chapter unchanged = releasedChapter("unchanged", "Unchanged text");
        Chapter later = releasedChapter("later", "Original later"); later.setContent("Private later update");
        book.setChapters(List.of(earlier, unchanged, chapter, later));
        var impact = service.reviewPublication("author-1", "book-1", "chapter-1", true);
        assertEquals(List.of("earlier", "chapter-1"), impact.chapters().stream().map(c -> c.id()).toList());
        assertEquals("UPDATE", impact.chapters().get(0).changeType()); assertEquals(1, impact.privateUpdatesRemaining());
        service.publishReviewed("author-1", "book-1", "chapter-1", impact.reviewToken(), true);
        assertEquals("Private earlier update", PublishedChapterView.of(earlier).content());
        assertEquals("Original later", PublishedChapterView.of(later).content());
        assertEquals(NOW.minusSeconds(500), unchanged.getPublishedAt()); assertEquals(0, unchanged.getEditRevision());
    }

    @Test
    void reviewTokenBindsComparisonReleaseScopeAndLiveBaseline() {
        chapter.setStatus("published"); PublishedChapterView.capture(chapter); chapter.setContent("Updated");
        var review = service.reviewPublication("author-1", "book-1", "chapter-1", true);
        assertNotNull(service.compare("author-1", "book-1", "chapter-1", "chapter-1", review.reviewToken(), true));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.publishReviewed("author-1", "book-1", "chapter-1", review.reviewToken(), false)).getStatusCode().value());
        chapter.setPublishedContent("Another published baseline");
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.compare("author-1", "book-1", "chapter-1", "chapter-1", review.reviewToken(), true)).getStatusCode().value());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.publishReviewed("author-1", "book-1", "chapter-1", review.reviewToken(), true)).getStatusCode().value());
        verify(books, never()).save(any());
    }

    @Test
    void comparisonIsOwnerOnlyAndCannotReadChaptersOutsideReviewedRelease() {
        Chapter later = releasedChapter("later", "Later text"); book.setChapters(List.of(chapter, later));
        var review = service.reviewPublication("author-1", "book-1", "chapter-1");
        assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.compare("other", "book-1", "chapter-1", null, null, false)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.compare("author-1", "book-1", "later", "chapter-1", review.reviewToken(), false)).getStatusCode().value());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.compare("author-1", "book-1", "chapter-1", "chapter-1", null, false)).getStatusCode().value());
    }

    private Chapter releasedChapter(String id, String content) {
        Chapter result = new Chapter(); result.setId(id); result.setTitle(id); result.setContent(content); result.updateWordCount();
        result.setStatus("published"); result.setPublishedAt(NOW.minusSeconds(500)); PublishedChapterView.capture(result); return result;
    }

}
