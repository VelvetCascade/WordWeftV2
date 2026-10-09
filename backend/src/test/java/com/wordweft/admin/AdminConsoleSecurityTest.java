package com.wordweft.admin;

import com.wordweft.config.SecurityConfig;
import com.wordweft.security.jwt.AuthEntryPointJwt;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsServiceImpl;
import com.wordweft.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@WebMvcTest(AdminConsoleController.class)
@Import(SecurityConfig.class)
class AdminConsoleSecurityTest {
    @Autowired MockMvc mvc;
    @MockBean MongoTemplate mongo;
    @MockBean UserDetailsServiceImpl userDetails;
    @MockBean JwtUtils jwt;
    @MockBean AuthEntryPointJwt entryPoint;

    @Test void ordinaryMembersCannotReadOrModifyAdminData() throws Exception {
        mvc.perform(get("/api/admin/console/users").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/console/stories").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/console/overview").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/console/reports").with(user("reader").roles("USER")))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/console/reports/one")
                .with(user("reader").roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"RESOLVED\",\"reason\":\"Reviewed and checked\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(mongo);
    }

    @Test void adminsCanReadSafeEmptyMemberDirectory() throws Exception {
        when(mongo.find(any(Query.class), eq(User.class))).thenReturn(List.of());
        mvc.perform(get("/api/admin/console/users").with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test void paginationAndFiltersAreBounded() throws Exception {
        mvc.perform(get("/api/admin/console/users?size=200").with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/console/stories?status=unknown").with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/console/users?q=" + "x".repeat(81)).with(user("admin").roles("ADMIN")))
                .andExpect(status().isBadRequest());
    }
}
