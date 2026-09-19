package com.wordweft.book.service;

import com.wordweft.book.model.Chapter;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Selects the immutable public projection of a released chapter. */
public final class PublishedChapterView {
    private PublishedChapterView() {}

    public record Snapshot(
            String title,
            String content,
            int wordCount,
            List<String> contentWarnings,
            String disclaimerNote) {}

    public static Snapshot of(Chapter chapter) {
        boolean hasSnapshot = chapter.getPublishedContent() != null;
        return new Snapshot(
                Objects.requireNonNullElse(
                        hasSnapshot ? chapter.getPublishedTitle() : chapter.getTitle(), ""),
                Objects.requireNonNullElse(
                        hasSnapshot ? chapter.getPublishedContent() : chapter.getContent(), ""),
                hasSnapshot && chapter.getPublishedWordCount() != null
                        ? chapter.getPublishedWordCount()
                        : chapter.getWordCount(),
                List.copyOf(Objects.requireNonNullElse(
                        hasSnapshot ? chapter.getPublishedContentWarnings() : chapter.getContentWarnings(),
                        List.of())),
                hasSnapshot ? chapter.getPublishedDisclaimerNote() : chapter.getDisclaimerNote());
    }

    public static void capture(Chapter chapter) {
        chapter.setPublishedTitle(chapter.getTitle());
        chapter.setPublishedContent(Objects.requireNonNullElse(chapter.getContent(), ""));
        chapter.setPublishedWordCount(chapter.getWordCount());
        chapter.setPublishedContentWarnings(new ArrayList<>(
                Objects.requireNonNullElse(chapter.getContentWarnings(), List.of())));
        chapter.setPublishedDisclaimerNote(chapter.getDisclaimerNote());
    }

    /** Preserve the current live copy before the first post-migration edit. */
    public static void preserveLegacySnapshot(Chapter chapter) {
        if ("published".equals(chapter.getStatus()) && chapter.getPublishedContent() == null) {
            capture(chapter);
        }
    }
}
