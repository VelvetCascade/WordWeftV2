
package com.wordweft.security.jwt;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

  private static final Logger logger = LoggerFactory.getLogger(AuthEntryPointJwt.class);

  @Override
  public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
      throws IOException, ServletException {
    logger.error("Unauthorized error: {}", authException.getMessage());
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType("application/json");
    response.setHeader("Cache-Control", "private, no-store");
    response.getWriter().write("{\"errorCode\":\"SESSION_INVALID\","
        + "\"message\":\"Your session has expired. Please sign in again.\"}");
  }
}
