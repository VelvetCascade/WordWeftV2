package com.wordweft.book.service;

import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChapterPreviewServiceTest {

    private final ChapterPreviewService service = new ChapterPreviewService();

    @Test
    void usesSixtyPercentForShortChaptersAndNeverReturnsEverything() {
        ChapterPreviewService.Preview preview = service.preview(paragraphs(800));

        assertTrue(preview.previewWordCount() >= 450);
        assertTrue(preview.previewWordCount() < preview.fullWordCount());
        assertFalse(preview.html().contains("WORD_799"));
    }

    @Test
    void clampsLongChaptersAndKeepsHtmlWellFormed() {
        String fullText = words(3000);
        ChapterPreviewService.Preview preview = service.preview("<p><strong>" + fullText + "</strong></p>");

        assertTrue(preview.previewWordCount() >= 600);
        assertTrue(preview.previewWordCount() <= 1200);
        assertDoesNotThrow(() -> Jsoup.parseBodyFragment(preview.html()));
        assertNotEquals(fullText, Jsoup.parse(preview.html()).text());
    }

    @Test
    void omitsUnsafeAndOutOfBudgetAtomicBlocks() {
        String html = "<script>SECRET_SCRIPT</script><p>" + words(700)
                + "</p><table><tr><td>TABLE_SECRET</td></tr></table>";

        ChapterPreviewService.Preview preview = service.preview(html);

        assertFalse(preview.html().contains("SECRET_SCRIPT"));
        assertFalse(preview.html().contains("TABLE_SECRET"));
    }

    @Test
    void tinyChaptersStillNeverReturnTheWholeChapter() {
        ChapterPreviewService.Preview preview = service.preview("<p>one two</p>");

        assertTrue(preview.previewWordCount() < preview.fullWordCount());
    }

    private static String paragraphs(int wordCount) {
        int midpoint = wordCount / 2;
        return "<p>" + numberedWords(0, midpoint) + "</p><p>" + numberedWords(midpoint, wordCount) + "</p>";
    }

    private static String words(int count) {
        return numberedWords(0, count);
    }

    private static String numberedWords(int fromInclusive, int toExclusive) {
        StringBuilder result = new StringBuilder();
        for (int index = fromInclusive; index < toExclusive; index++) {
            if (!result.isEmpty()) {
                result.append(' ');
            }
            result.append("WORD_").append(index);
        }
        return result.toString();
    }
}
