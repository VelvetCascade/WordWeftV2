package com.wordweft.exception;

public class AuthRequiredException extends RuntimeException {
    public AuthRequiredException() {
        super("Sign in to read this chapter.");
    }
}
