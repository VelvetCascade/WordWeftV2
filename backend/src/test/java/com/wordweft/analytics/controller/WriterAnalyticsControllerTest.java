package com.wordweft.analytics.controller;

import com.wordweft.analytics.dto.WriterAnalyticsResponse;
import com.wordweft.analytics.service.WriterGrowthService;
import com.wordweft.config.SecurityConfig;
import com.wordweft.security.jwt.AuthEntryPointJwt;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.security.services.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WriterAnalyticsController.class)
@Import(SecurityConfig.class)
class WriterAnalyticsControllerTest {
    @Autowired MockMvc mvc;
    @MockBean WriterGrowthService growth;
    @MockBean UserDetailsServiceImpl userDetailsService;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;

    private final UserDetailsImpl author = new UserDetailsImpl(
            "author", "writer", "writer@example.com", "password",
            List.of(new SimpleGrantedAuthority("ROLE_USER")));

    @Test
    void authenticatedWriterCanRequestStoryAnalytics() throws Exception {
        WriterAnalyticsResponse response = WriterAnalyticsResponse.empty();
        when(growth.getAnalytics(eq("author"), eq("book"), any())).thenReturn(response);

        mvc.perform(get("/api/writer/analytics?bookId=book").with(user(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.uniqueReaders").value(0))
                .andExpect(jsonPath("$.dailyTrend").isArray());

        verify(growth).getAnalytics(eq("author"), eq("book"), any());
    }

    @Test
    void guestCannotRequestWriterAnalytics() throws Exception {
        doAnswer(invocation -> {
            ((jakarta.servlet.http.HttpServletResponse) invocation.getArgument(1)).sendError(401);
            return null;
        }).when(entryPoint).commence(any(), any(), any());

        mvc.perform(get("/api/writer/analytics"))
                .andExpect(status().isUnauthorized());
    }
}
