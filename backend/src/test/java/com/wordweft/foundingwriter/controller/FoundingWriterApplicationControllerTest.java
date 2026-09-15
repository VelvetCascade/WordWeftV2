package com.wordweft.foundingwriter.controller;

import com.wordweft.config.SecurityConfig;
import com.wordweft.foundingwriter.service.FoundingWriterApplicationService;
import com.wordweft.security.jwt.AuthEntryPointJwt;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({FoundingWriterApplicationController.class, FoundingWriterAdminController.class})
@Import(SecurityConfig.class)
class FoundingWriterApplicationControllerTest {
    @Autowired MockMvc mvc;
    @MockBean FoundingWriterApplicationService service;
    @MockBean UserDetailsServiceImpl userDetails;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;

    @Test
    void guestsCanSubmitValidApplications() throws Exception {
        when(service.submit(any())).thenReturn(true);
        mvc.perform(post("/api/public/founding-writer-applications")
                        .contentType("application/json")
                        .content(validApplication()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Your application has been received."));
    }

    @Test
    void rejectsApplicationsWithoutAnyWritingSample() throws Exception {
        mvc.perform(post("/api/public/founding-writer-applications")
                        .contentType("application/json")
                        .content(validApplication().replace("Once upon a time", "")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void onlyAdminsCanReadTheReviewDesk() throws Exception {
        mvc.perform(get("/api/admin/founding-writer-applications").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);

        when(service.list(null)).thenReturn(List.of());
        mvc.perform(get("/api/admin/founding-writer-applications").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    private String validApplication() {
        return """
                {
                  "fullName":"Writer Name",
                  "email":"writer@example.com",
                  "country":"India",
                  "genre":"Fantasy",
                  "storyTitle":"A Story",
                  "storyDescription":"An original serial story.",
                  "pastedWritingSample":"Once upon a time",
                  "draftedChapterCount":3,
                  "plannedChapterCount":20,
                  "expectedCompletionPeriod":"TWO_TO_FOUR_MONTHS",
                  "ageConfirmed":true,
                  "rightsConfirmed":true,
                  "completionCommitted":true,
                  "weeklyPublishingCommitted":true,
                  "earningsDisclaimerConfirmed":true,
                  "termsConfirmed":true
                }
                """;
    }
}
