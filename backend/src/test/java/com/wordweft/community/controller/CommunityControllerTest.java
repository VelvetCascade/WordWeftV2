package com.wordweft.community.controller;

import com.wordweft.community.dto.CommunityDtos.CursorPage;
import com.wordweft.community.service.*;
import com.wordweft.config.SecurityConfig;
import com.wordweft.security.jwt.*;
import com.wordweft.security.services.UserDetailsServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@WebMvcTest(CommunityController.class)
@Import({SecurityConfig.class, CommunityExceptionHandler.class})
class CommunityControllerTest {
    @Autowired MockMvc mvc;
    @MockBean CommunityQueries queries;
    @MockBean CommunityService service;
    @MockBean CommunityMapper mapper;
    @MockBean CommunityAccess access;
    @MockBean CommunityIdentityService identity;
    @MockBean CommunityModerationService moderation;
    @MockBean UserDetailsServiceImpl userDetails;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;

    @Test void guestsCanReadCircleAndDiscoverFeed() throws Exception {
        when(queries.circles(null)).thenReturn(List.of());
        when(queries.feed(null, "discover", null, null, null, null, 15)).thenReturn(new CursorPage<>(List.of(), null));
        mvc.perform(get("/api/community/circles")).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/community/feed")).andExpect(status().isOk()).andExpect(jsonPath("$.items").isArray());
    }
    @Test void guestWritesAreStoppedBySecurityBeforeService() throws Exception {
        doAnswer(i -> { ((jakarta.servlet.http.HttpServletResponse)i.getArgument(1)).sendError(401); return null; }).when(entryPoint).commence(any(), any(), any());
        mvc.perform(post("/api/community/posts").contentType("application/json").content("{\"body\":\"hello\"}")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void ordinaryUsersCannotReadModerationQueueOrAssignBadges() throws Exception {
        mvc.perform(get("/api/community/moderation/reports").with(user("reader").roles("USER"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/community/members/reader/badges").with(user("reader").roles("USER")).contentType("application/json").content("{\"badges\":[\"COMMUNITY_MODERATOR\"]}")).andExpect(status().isForbidden());
        verifyNoInteractions(moderation, identity);
    }
}
