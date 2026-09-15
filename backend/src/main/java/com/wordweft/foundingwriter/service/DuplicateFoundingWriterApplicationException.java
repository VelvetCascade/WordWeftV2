package com.wordweft.foundingwriter.service;

public class DuplicateFoundingWriterApplicationException extends RuntimeException {
    public DuplicateFoundingWriterApplicationException() {
        super("An application has already been submitted with this email address.");
    }
}
