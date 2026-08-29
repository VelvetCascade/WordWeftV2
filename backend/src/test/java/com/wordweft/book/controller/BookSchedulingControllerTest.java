package com.wordweft.book.controller;

import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.book.service.ChapterPublishingService;
import com.wordweft.config.SecurityConfig;
import com.wordweft.notification.service.NotificationService;
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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
    @MockBean UserDetailsServiceImpl userDetailsService;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;

    private final UserDetailsImpl author = new UserDetailsImpl(
            "author", "writer", "writer@example.com", "password",
            List.of(new SimpleGrantedAuthority("ROLE_USER")));

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
}
