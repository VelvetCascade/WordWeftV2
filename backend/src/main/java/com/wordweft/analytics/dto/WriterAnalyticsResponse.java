package com.wordweft.analytics.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record WriterAnalyticsResponse(
        Summary summary,
        List<StorySummary> stories,
        List<ChapterFunnelRow> chapterFunnel,
        List<DailyTrendPoint> dailyTrend,
        List<ReferrerTotal> referrers,
        List<ReleaseMarker> releaseMarkers) {

    public record Summary(
            int uniqueReaders,
            int views,
            int completedReaders,
            double completionRate,
            int returningReaders,
            double averageCompletion,
            int likes,
            int comments) {}

    public record StorySummary(
            String bookId,
            String title,
            String coverUrl,
            int uniqueReaders,
            int views,
            int completedReaders,
            double completionRate,
            int likes,
            int comments) {}

    public record ChapterFunnelRow(
            String bookId,
            String chapterId,
            String title,
            int chapterNumber,
            int views,
            int reachedReaders,
            int completedReaders,
            double completionRate,
            double continuationRate,
            int likes,
            int comments) {}

    public record DailyTrendPoint(LocalDate date, int readers, int views) {}

    public record ReferrerTotal(String source, int readers, int views) {}

    public record ReleaseMarker(
            String bookId,
            String chapterId,
            String chapterTitle,
            Instant publishedAt) {}

    public static WriterAnalyticsResponse empty() {
        return new WriterAnalyticsResponse(
                new Summary(0, 0, 0, 0, 0, 0, 0, 0),
                List.of(), List.of(), List.of(), List.of(), List.of());
    }
}
