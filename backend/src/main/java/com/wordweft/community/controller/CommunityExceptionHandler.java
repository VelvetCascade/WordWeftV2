package com.wordweft.community.controller;

import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Order(0)
@RestControllerAdvice(basePackages = "com.wordweft.community.controller")
public class CommunityExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> conflict(IllegalStateException ex) { return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage())); }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException ex) { return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason() == null ? "Request could not be completed." : ex.getReason())); }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<?> body(Exception ex) { return ResponseEntity.badRequest().body(Map.of("message", "Check the required fields and try again.")); }
}
