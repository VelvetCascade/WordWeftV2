package com.wordweft.analytics.controller;

import com.wordweft.analytics.service.AnalyticsService;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AnalyticsControllerTest {

    private final AnalyticsService analyticsService = mock(AnalyticsService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AnalyticsController controller = new AnalyticsController();
        ReflectionTestUtils.setField(controller, "analyticsService", analyticsService);
        ReflectionTestUtils.setField(controller, "userRepository", userRepository);
        mockMvc = standaloneSetup(controller).build();
    }

    @Test
    void acceptsABoundedAnonymousBatchWithoutLookingUpAUser() throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .contentType("application/json")
                        .content(batch(2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventsReceived").value(2));

        verify(userRepository, never()).findById(isNull());
        verify(analyticsService).sendAnalyticsBatch(eq("anonymous"), eq("Anonymous"), eq(""),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsMoreThanTwentyEvents() throws Exception {
        mockMvc.perform(post("/api/analytics/events")
                        .contentType("application/json")
                        .content(batch(21)))
                .andExpect(status().isBadRequest());

        verify(analyticsService, never()).sendAnalyticsBatch(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsOversizedEventFieldsAndNestedMetadata() throws Exception {
        String oversized = "x".repeat(65);
        String json = "{\"events\":[{\"sessionId\":\"s\",\"category\":\"" + oversized
                + "\",\"action\":\"reader_preview_started\",\"metadata\":{\"unsafe\":{\"content\":\"text\"}}}]}";

        mockMvc.perform(post("/api/analytics/events").contentType("application/json").content(json))
                .andExpect(status().isBadRequest());
    }

    private static String batch(int events) {
        String event = "{\"sessionId\":\"session\",\"category\":\"reader_gate\",\"action\":\"reader_preview_started\",\"pagePath\":\"/book/b/chapter/c\",\"metadata\":{\"bookId\":\"b\",\"chapterId\":\"c\",\"chapterIndex\":0,\"accessState\":\"PREVIEW\"}}";
        return "{\"events\":[" + java.util.stream.IntStream.range(0, events)
                .mapToObj(index -> event)
                .collect(java.util.stream.Collectors.joining(",")) + "]}";
    }
}
