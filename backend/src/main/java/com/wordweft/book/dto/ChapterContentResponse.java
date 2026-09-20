package com.wordweft.book.dto;

public record ChapterContentResponse(
        String bookId,
        String bookTitle,
        String chapterId,
        String chapterTitle,
        int chapterIndex,
        ChapterAccess access,
        String content,
        int previewWordCount,
        int fullWordCount,
        boolean obfuscated,
        String obfuscationSeed,
        String fontFamily) {

    public ChapterContentResponse(
            String bookId,
            String bookTitle,
            String chapterId,
            String chapterTitle,
            int chapterIndex,
            ChapterAccess access,
            String content,
            int previewWordCount,
            int fullWordCount) {
        this(bookId, bookTitle, chapterId, chapterTitle, chapterIndex, access, content, previewWordCount, fullWordCount, false, null, null);
    }

    public enum ChapterAccess {
        FULL,
        PREVIEW
    }
}
