package com.wordweft.exception;

public class ContentRestrictedException extends RuntimeException {
    public ContentRestrictedException(String message) {
        super(message);
    }
}
