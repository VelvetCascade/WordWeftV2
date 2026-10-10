package com.wordweft.book.controller;

import com.wordweft.analytics.service.ChapterReadEventService;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.book.service.ChapterPublishingService;
import com.wordweft.book.service.ChapterContentService;
import com.wordweft.config.SecurityConfig;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.manuscript.service.ManuscriptImportService;
import com.wordweft.manuscript.service.ChapterRevisionService;
import com.wordweft.security.jwt.AuthEntryPointJwt;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.security.services.UserDetailsServiceImpl;
import com.wordweft.support.ImageKitService;
import com.wordweft.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@WebMvcTest(BookController.class)
@Import(SecurityConfig.class)
class BookSchedulingControllerTest {
    @Autowired MockMvc mvc;
    @MockBean BookService bookService;
    @MockBean BookRepository bookRepository;
    @MockBean UserService userService;
    @MockBean NotificationService notificationService;
    @MockBean ImageKitService imageKitService;
    @MockBean ChapterPublishingService publishing;
    @MockBean com.wordweft.book.service.ChapterWriteService chapterWriteService;
    @MockBean ChapterContentService chapterContentService;
    @MockBean com.wordweft.book.service.ChapterOrganizationService chapterOrganizationService;
    @MockBean ChapterReadEventService readEvents;
    @MockBean ManuscriptImportService manuscriptImportService;
    @MockBean ChapterRevisionService chapterRevisionService;
    @MockBean UserDetailsServiceImpl userDetailsService;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;
    @MockBean com.wordweft.book.service.ContentAccessService contentAccessService;
    @MockBean com.wordweft.user.repository.UserRepository userRepository;

    private final UserDetailsImpl author = new UserDetailsImpl(
            "author", "writer", "writer@example.com", "password",
            List.of(new SimpleGrantedAuthority("ROLE_USER")));

    @Test
    void malformedMetadataReturnsBadRequestBeforeWriting() throws Exception {
        mvc.perform(patch("/api/books/book").with(user(author)).contentType("application/json").content("{\"ageRating\":\"invalid\"}"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(chapterWriteService);
    }

    @Test
    void sparseMetadataPatchUpdatesSummaryAndPreservesTagsAndOtherOmittedFields() throws Exception {
        var book = new com.wordweft.book.model.Book(); book.setId("book"); book.setAuthorId("author"); book.setTitle("Before");
        book.setTags(List.of("family")); book.setGenres(List.of("Fantasy")); book.setReadingStatus("Hiatus"); book.setAgeRating(com.wordweft.book.model.AgeRating.TEEN_13); book.setAIGenerated(true);
        when(bookRepository.findById("book")).thenReturn(java.util.Optional.of(book)); when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));
        mvc.perform(patch("/api/books/book").with(user(author)).contentType("application/json").content("{\"summary\":\"Independent summary\"}"))
                .andExpect(status().isOk());
        verify(chapterWriteService).updateMetadata(org.mockito.ArgumentMatchers.argThat(saved -> saved.getTags().equals(List.of("family")) && saved.getGenres().equals(List.of("Fantasy"))
                && "Independent summary".equals(saved.getSummary()) && "Hiatus".equals(saved.getReadingStatus()) && saved.getAgeRating() == com.wordweft.book.model.AgeRating.TEEN_13 && saved.isAIGenerated()), any());
    }

    @Test
    void metadataPatchAppliesExplicitTagsAndCanClearThem() throws Exception {
        var book = new com.wordweft.book.model.Book(); book.setId("book"); book.setAuthorId("author"); book.setTags(List.of("family"));
        when(bookRepository.findById("book")).thenReturn(java.util.Optional.of(book)); when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));
        mvc.perform(patch("/api/books/book").with(user(author)).contentType("application/json").content("{\"tags\":[\"family\",\"homecoming\"],\"summary\":\"Independent\",\"author\":\"Display author\"}"))
                .andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertEquals(List.of("family", "homecoming"), book.getTags());
        mvc.perform(patch("/api/books/book").with(user(author)).contentType("application/json").content("{\"tags\":[]}"))
                .andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertTrue(book.getTags().isEmpty());
    }

    @Test
    void titleOnlyPrivateDraftKeepsBlankDescriptionAndCover() throws Exception {
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));
        mvc.perform(post("/api/books").with(user(author)).contentType("application/json")
                        .content("{\"title\":\"Title only private draft\",\"description\":\"\",\"coverUrl\":\"\"}"))
                .andExpect(status().isOk());
        verify(bookRepository).save(org.mockito.ArgumentMatchers.argThat(book -> "draft".equals(book.getPublicationStatus())
                && "".equals(book.getDescription()) && "".equals(book.getCoverUrl()) && "author".equals(book.getAuthorId())));
    }

    @Test
    void guestsCannotReadFullRevisionContent() throws Exception {
        mvc.perform(get("/api/books/book/chapters/chapter/revisions/revision")).andExpect(status().isUnauthorized());
        org.mockito.Mockito.verifyNoInteractions(chapterRevisionService);
    }

    @Test
    void checkpointCarriesTheSavedDraftRevisionIntoItsConcurrencyGuard() throws Exception {
        var checkpoint = new com.wordweft.manuscript.model.ChapterRevision(); checkpoint.setId("checkpoint");
        when(chapterRevisionService.checkpoint("author", "book", "chapter", "Before ending", 3L)).thenReturn(checkpoint);
        mvc.perform(post("/api/books/book/chapters/chapter/revisions").with(user(author)).contentType("application/json")
                .content("{\"label\":\"Before ending\",\"expectedRevision\":3}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("checkpoint"));
        verify(chapterRevisionService).checkpoint("author", "book", "chapter", "Before ending", 3L);
    }

    @Test
    void workingDraftRestoreExplicitlySelectsNonWithdrawingBehavior() throws Exception {
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));
        mvc.perform(post("/api/books/book/chapters/chapter/revisions/revision/restore")
                        .queryParam("mode", "working-draft").queryParam("expectedRevision", "3").with(user(author)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"));
        verify(chapterRevisionService).restore("author", "book", "chapter", "revision", 3L, true);
    }

    @Test
    void chapterOrderPassesOnlyTheOwnerAndCompleteIdListToTheGuardedService() throws Exception {
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));
        mvc.perform(put("/api/books/book/chapters/order").with(user(author)).contentType("application/json").content("{\"chapterIds\":[\"a\",\"b\"]}"))
                .andExpect(status().isOk());
        verify(chapterOrganizationService).reorder("author", "book", List.of("a", "b"));
    }

    @Test
    void ownerCanScheduleAChapter() throws Exception {
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));

        mvc.perform(put("/api/books/book/chapters/chapter/schedule")
                        .with(user(author))
                        .contentType("application/json")
                        .content("{\"scheduledAt\":\"2026-09-01T12:30:00Z\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("author"));

        verify(publishing).schedule(
                "author", "book", "chapter", Instant.parse("2026-09-01T12:30:00Z"));
    }

    @Test
    void ownerCanCancelAChapterSchedule() throws Exception {
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author"));

        mvc.perform(delete("/api/books/book/chapters/chapter/schedule").with(user(author)))
                .andExpect(status().isOk());

        verify(publishing).cancelSchedule("author", "book", "chapter");
    }

    @Test
    void anonymousReaderCanRecordAChapterView() throws Exception {
        mvc.perform(post("/api/books/book/chapters/chapter/view")
                        .contentType("application/json")
                        .content("{\"sessionId\":\"9f45f6dc-e555-451e-9bc9-4bf54fd715de\",\"referrer\":\"https://example.com/post\"}"))
                .andExpect(status().isNoContent());

        verify(readEvents).record(
                eq("book"), eq("chapter"), isNull(),
                eq("9f45f6dc-e555-451e-9bc9-4bf54fd715de"),
                eq("https://example.com/post"), any(Instant.class));
    }

    @Test
    void chapterRecoveryHistoryIsPrivate() throws Exception {
        doAnswer(invocation -> {
            ((jakarta.servlet.http.HttpServletResponse) invocation.getArgument(1)).sendError(401);
            return null;
        }).when(entryPoint).commence(any(), any(), any());

        mvc.perform(get("/api/books/book/chapters/chapter/revisions"))
                .andExpect(status().isUnauthorized());
    }
    @Test
    void saveAcknowledgementUsesCommittedRevisionEvenWhenProfileContainsALaterSession() throws Exception {
        var chapter = new com.wordweft.book.model.Chapter(); chapter.setId("chapter"); chapter.setTitle("Before"); chapter.setContent("Before draft");
        var book = new com.wordweft.book.model.Book(); book.setId("book"); book.setAuthorId("author"); book.setChapters(new java.util.ArrayList<>(List.of(chapter)));
        when(bookRepository.findById("book")).thenReturn(java.util.Optional.of(book));
        when(userService.getUserProfile("author")).thenReturn(Map.of("id", "author", "writtenBooks", List.of(Map.of("id", "book", "chapters", List.of(Map.of("id", "chapter", "editRevision", 9))))));
        mvc.perform(patch("/api/books/book/chapters/chapter").with(user(author)).contentType("application/json")
                .content("{\"data\":{\"title\":\"My version\",\"content\":\"My draft\"},\"status\":\"preserve\",\"expectedRevision\":0}"))
                .andExpect(status().isOk()).andExpect(header().string("X-Chapter-Revision", "1"))
                .andExpect(jsonPath("$.writtenBooks[0].chapters[0].editRevision").value(9));
    }

    @Test void publicationImpactAndEditSessionAreNeverAnonymous() throws Exception {
        doAnswer(invocation -> { ((jakarta.servlet.http.HttpServletResponse) invocation.getArgument(1)).sendError(401); return null; })
                .when(entryPoint).commence(any(), any(), any());
        mvc.perform(get("/api/books/book/chapters/chapter/publication-impact")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/books/book/chapters/chapter/edit-session")).andExpect(status().isUnauthorized());
    }

    @Test
    void guestsCannotReadComparisonDraftBodies() throws Exception {
        doAnswer(invocation -> { ((jakarta.servlet.http.HttpServletResponse) invocation.getArgument(1)).sendError(401); return null; })
                .when(entryPoint).commence(any(), any(), any());
        mvc.perform(get("/api/books/book/chapters/chapter/comparison")).andExpect(status().isUnauthorized());
        org.mockito.Mockito.verifyNoInteractions(publishing);
    }

    @Test
    void authorComparisonIsNotCachedAndCarriesCompleteReviewScope() throws Exception {
        when(publishing.compare("author", "book", "chapter", "target", "token", true)).thenReturn(
                new ChapterPublishingService.ChapterComparison(null, new com.wordweft.book.service.PublishedChapterView.Snapshot("Title", "Private", 1, List.of(), ""), false, null, 2));
        mvc.perform(get("/api/books/book/chapters/chapter/comparison").param("releaseChapterId", "target").param("reviewToken", "token").param("includePublishedUpdates", "true").with(user(author)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "private, no-store"))
                .andExpect(jsonPath("$.draft.content").value("Private")).andExpect(jsonPath("$.editRevision").value(2));
    }

}
