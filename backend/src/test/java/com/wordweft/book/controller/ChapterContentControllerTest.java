package com.wordweft.book.controller;

import com.wordweft.book.dto.ChapterContentResponse;
import com.wordweft.book.service.ChapterContentService;
import com.wordweft.exception.AuthRequiredException;
import com.wordweft.exception.ContentRestrictedException;
import com.wordweft.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.FULL;
import static com.wordweft.book.dto.ChapterContentResponse.ChapterAccess.PREVIEW;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ChapterContentControllerTest {

    private final ChapterContentService service = mock(ChapterContentService.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        BookController controller = new BookController();
        controller.chapterContentService = service;
        mockMvc = standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void previewIsPublicAndShortLived() throws Exception {
        when(service.load("book", "first")).thenReturn(response(PREVIEW, "PREVIEW_TEXT"));

        mockMvc.perform(get("/api/books/book/chapters/first/content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access").value("PREVIEW"))
                .andExpect(header().string("Cache-Control", containsString("max-age=300")))
                .andExpect(header().string("Cache-Control", containsString("public")));
    }

    @Test
    void fullContentIsPrivateAndNeverStored() throws Exception {
        when(service.load("book", "second")).thenReturn(response(FULL, "SECOND_FULL"));

        mockMvc.perform(get("/api/books/book/chapters/second/content"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access").value("FULL"))
                .andExpect(header().string("Cache-Control", containsString("private")))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void signInAgeAndMissingErrorsRemainDistinct() throws Exception {
        when(service.load("book", "later")).thenThrow(new AuthRequiredException());
        when(service.load("book", "adult")).thenThrow(new ContentRestrictedException("Restricted"));
        when(service.load("book", "missing")).thenThrow(new ChapterContentService.ContentNotFoundException());

        mockMvc.perform(get("/api/books/book/chapters/later/content"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("AUTH_REQUIRED"))
                .andExpect(jsonPath("$.message").value("Sign in to read this chapter."));
        mockMvc.perform(get("/api/books/book/chapters/adult/content"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/books/book/chapters/missing/content"))
                .andExpect(status().isNotFound());
    }

    private static ChapterContentResponse response(
            ChapterContentResponse.ChapterAccess access,
            String content) {
        return new ChapterContentResponse(
                "book", "Story", "first", "First", 0,
                access, content, 400, 700);
    }
}
