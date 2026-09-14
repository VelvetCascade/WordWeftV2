package com.wordweft.exception;

import com.wordweft.book.service.ChapterContentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AuthRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleAuthRequired(AuthRequiredException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
                .body(Map.of(
                        "errorCode", "AUTH_REQUIRED",
                        "message", ex.getMessage()));
    }

    @ExceptionHandler(ChapterContentService.ContentNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleContentNotFound(
            ChapterContentService.ContentNotFoundException ex) {
        return new ResponseEntity<>(Map.of(
                "errorCode", "CONTENT_NOT_FOUND",
                "message", ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ContentRestrictedException.class)
    public ResponseEntity<Map<String, Object>> handleContentRestricted(ContentRestrictedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("errorCode", "MATURE_CONTENT_RESTRICTED");
        body.put("message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }
}
