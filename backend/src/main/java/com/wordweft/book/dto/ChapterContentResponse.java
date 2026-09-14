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
        int fullWordCount) {

    public enum ChapterAccess {
        FULL,
        PREVIEW
    }
}
