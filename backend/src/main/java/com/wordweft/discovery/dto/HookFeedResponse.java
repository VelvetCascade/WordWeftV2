package com.wordweft.discovery.dto;

import java.util.List;

public record HookFeedResponse(
        List<Hook> items,
        List<String> tasteGenres,
        boolean personalized
) {
    public record Hook(
            String bookId,
            String chapterId,
            String title,
            String chapterTitle,
            String authorId,
            String authorName,
            String coverUrl,
            String excerpt,
            List<String> genres,
            List<String> matchedGenres,
            int wordCount,
            int readingMinutes,
            int likesCount
    ) {}
}
