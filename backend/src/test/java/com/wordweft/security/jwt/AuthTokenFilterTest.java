package com.wordweft.security.jwt;

import com.wordweft.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthTokenFilterTest {

    @Test
    void invalidCredentialOnAPublicRouteReturnsStableSessionInvalidResponse() throws Exception {
        JwtUtils jwtUtils = mock(JwtUtils.class);
        UserDetailsServiceImpl users = mock(UserDetailsServiceImpl.class);
        FilterChain chain = mock(FilterChain.class);
        AuthTokenFilter filter = new AuthTokenFilter();
        ReflectionTestUtils.setField(filter, "jwtUtils", jwtUtils);
        ReflectionTestUtils.setField(filter, "userDetailsService", users);
        ReflectionTestUtils.setField(filter, "unauthorizedHandler", new AuthEntryPointJwt());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/books/book/chapters/chapter/content");
        request.addHeader("Authorization", "Bearer expired-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(jwtUtils.validateJwtToken("expired-token")).thenReturn(false);

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"errorCode\":\"SESSION_INVALID\""));
        verify(chain, never()).doFilter(request, response);
    }
}
