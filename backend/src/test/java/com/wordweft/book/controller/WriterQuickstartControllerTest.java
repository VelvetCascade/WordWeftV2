package com.wordweft.book.controller;

import com.wordweft.book.service.WriterQuickstartService;
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
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WriterQuickstartController.class)
@Import(SecurityConfig.class)
class WriterQuickstartControllerTest {
    @Autowired MockMvc mvc;
    @MockBean WriterQuickstartService progress;
    @MockBean UserDetailsServiceImpl users;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;
    @Test void ownerGuideUsesAuthenticatedAccountAndPrivateCacheHeaders() throws Exception {
        UserDetailsImpl author = new UserDetailsImpl("author", "author", "author@example.test", "password", List.of());
        when(progress.get("author")).thenReturn(new WriterQuickstartService.Progress(true, false, true, false));
        mvc.perform(get("/api/writer/quickstart").with(user(author)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.characters").value(true)).andExpect(jsonPath("$.mentions").value(false))
                .andExpect(header().string("Cache-Control", "private, no-store"));
        verify(progress).get("author");
    }
    @Test void anonymousGuideNeverQueriesPrivateProgress() throws Exception {
        doAnswer(call -> { ((jakarta.servlet.http.HttpServletResponse) call.getArgument(1)).sendError(401); return null; }).when(entryPoint).commence(any(), any(), any());
        mvc.perform(get("/api/writer/quickstart")).andExpect(status().isUnauthorized());
        verifyNoInteractions(progress);
    }
}
