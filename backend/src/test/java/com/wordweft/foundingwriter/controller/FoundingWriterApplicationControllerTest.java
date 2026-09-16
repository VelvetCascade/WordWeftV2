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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import org.springframework.mock.web.MockMultipartFile;
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
        when(service.submit(any(), any())).thenReturn(true);
        mvc.perform(multipart("/api/public/founding-writer-applications")
                        .file(new MockMultipartFile("application", "", "application/json", validApplication().getBytes()))
                        .file(new MockMultipartFile("file", "chapters.txt", "text/plain", "Chapter 1 Chapter 2 Chapter 3".getBytes())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Your application has been received."));
    }

    @Test
    void rejectsApplicationsWithoutChapterFile() throws Exception {
        mvc.perform(multipart("/api/public/founding-writer-applications")
                        .file(new MockMultipartFile("application", "", "application/json", validApplication().getBytes())))
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
                  "chaptersConfirmed":true,
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

    @Test
    void rejectsFewerThanThreeChaptersOrMissingConfirmation() throws Exception {
        for (String json : List.of(validApplication().replace("\"draftedChapterCount\":3", "\"draftedChapterCount\":2"),
                validApplication().replace("\"chaptersConfirmed\":true", "\"chaptersConfirmed\":false"))) {
            mvc.perform(multipart("/api/public/founding-writer-applications")
                            .file(new MockMultipartFile("application", "", "application/json", json.getBytes()))
                            .file(new MockMultipartFile("file", "chapters.txt", "text/plain", "Chapters".getBytes())))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void chapterDownloadsAreAdminOnlyAttachments() throws Exception {
        mvc.perform(get("/api/admin/founding-writer-applications/id/chapter-file").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
        var application = new com.wordweft.foundingwriter.model.FoundingWriterApplication();
        application.setId("id");
        application.setR2FileKey("secret.pdf");
        application.setChapterFileName("chapters.txt");
        application.setFileUploaded(true);
        when(service.findById("id")).thenReturn(application);
        mvc.perform(get("/api/admin/founding-writer-applications/id/chapter-file").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downloadUrl").value("https://worker.dev/download/..."));
    }
}
