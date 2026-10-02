package com.wordweft.book.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReadingProgressRepository;
import com.wordweft.book.service.ReadingProgressService;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.security.services.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReadingControllerTest {
    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        BookRepository books = mock(BookRepository.class);
        Chapter published = new Chapter();
        published.setId("published");
        published.setStatus("published");
        Chapter draft = new Chapter();
        draft.setId("draft");
        Book book = new Book();
        book.setId("book");
        book.setPublicationStatus("published");
        book.setChapters(List.of(published, draft));
        when(books.findById("book")).thenReturn(Optional.of(book));
        when(books.findById("missing")).thenReturn(Optional.empty());
        ContentAccessService access = mock(ContentAccessService.class);
        when(access.canAccess(org.mockito.ArgumentMatchers.any(Book.class))).thenReturn(true);
        ReadingController controller = new ReadingController();
        ReflectionTestUtils.setField(controller, "progressService", new ReadingProgressService(
                mock(MongoTemplate.class), books, mock(ReadingProgressRepository.class), access));
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
        UserDetailsImpl principal = new UserDetailsImpl("reader", "Reader", "reader@example.test", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @MethodSource("invalidPayloads")
    void invalidProgressPayloadReturnsBadRequest(Map<String, Object> payload) throws Exception {
        mvc.perform(post("/api/reading/progress").contentType("application/json")
                .content(json.writeValueAsString(payload))).andExpect(status().isBadRequest());
    }

    @Test
    void draftChapterReturnsBadRequest() throws Exception {
        mvc.perform(post("/api/reading/progress").contentType("application/json")
                .content(json.writeValueAsString(payload("book", "draft", 100, 120)))).andExpect(status().isBadRequest());
    }

    @Test
    void unknownChapterReturnsBadRequest() throws Exception {
        mvc.perform(post("/api/reading/progress").contentType("application/json")
                .content(json.writeValueAsString(payload("book", "missing", 100, 120)))).andExpect(status().isBadRequest());
    }

    @Test
    void missingBookReturnsNotFound() throws Exception {
        mvc.perform(post("/api/reading/progress").contentType("application/json")
                .content(json.writeValueAsString(payload("missing", "published", 100, 120)))).andExpect(status().isNotFound());
    }

    @Test
    void wholeNumericValuesAcceptDifferentJsonNumberTypes() {
        var request = ReadingProgressService.SaveRequest.from(payload("book", "published", 50L, 120.0));
        assertEquals(50, request.progress());
        assertEquals(120, request.scrollPosition());
        assertEquals(120, request.chapterScroll());
    }

    private static Stream<Map<String, Object>> invalidPayloads() {
        var invalid = new java.util.ArrayList<Map<String, Object>>();
        for (Object progress : List.of("50", -1, 101, 25.5, 4294967296L, true)) {
            invalid.add(payload("book", "published", progress, 120));
        }
        for (Object scroll : List.of("120", -1, 1.5, 2147483648L, true)) {
            invalid.add(payload("book", "published", 50, scroll));
        }
        invalid.add(payload("", "published", 50, 120));
        invalid.add(payload("book", "", 50, 120));
        invalid.add(Map.of("bookId", "book", "scrollPosition", 120));
        invalid.add(Map.of("bookId", "book", "scrollPosition", 120, "chapterData", "invalid"));
        invalid.add(Map.of("bookId", "book", "scrollPosition", 120,
                "chapterData", Map.of("id", "published", "progress", 50)));
        invalid.add(Map.of("bookId", "book", "scrollPosition", 120,
                "chapterData", Map.of("id", "published", "scroll", 120)));
        var missingScroll = payload("book", "published", 50, 120);
        missingScroll.remove("scrollPosition");
        invalid.add(missingScroll);
        var invalidIndex = payload("book", "published", 50, 120);
        invalidIndex.put("chapterIndex", -1);
        invalid.add(invalidIndex);
        return invalid.stream();
    }

    private static Map<String, Object> payload(String bookId, String chapterId, Object progress, Object scroll) {
        Map<String, Object> result = new HashMap<>();
        result.put("bookId", bookId);
        result.put("scrollPosition", scroll);
        result.put("chapterData", Map.of("id", chapterId, "progress", progress, "scroll", scroll));
        return result;
    }
}
