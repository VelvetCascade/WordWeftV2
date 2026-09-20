package com.wordweft.security.jwt;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.InsufficientAuthenticationException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthEntryPointJwtTest {

    @Test
    void rejectedCredentialReturnsStableSessionInvalidJsonWithoutErrorDispatch() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/me");
        MockHttpServletResponse response = new MockHttpServletResponse();

        new AuthEntryPointJwt().commence(
                request,
                response,
                new InsufficientAuthenticationException("Authentication required"));

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentType().startsWith("application/json"));
        assertTrue(response.getContentAsString().contains("\"errorCode\":\"SESSION_INVALID\""));
        assertTrue(response.getContentAsString().contains("\"message\":\"Your session has expired. Please sign in again.\""));
        assertEquals("private, no-store", response.getHeader("Cache-Control"));
    }
}
