package com.wordweft.manuscript.service;

import com.wordweft.book.model.Chapter;
import com.wordweft.book.service.PublishedChapterView;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ManuscriptTextTest {
    @Test void semanticTextPreservesBlockBoundariesDecodesEntitiesAndJoinsInlineWords() {
        String html = "<p data-mood='a decorative mood'>sun<strong>rise</strong>&nbsp;and &#x6d;oon</p><p>well-being<br>isn't split</p><img alt='not manuscript words'><script>hidden code</script>";
        assertEquals("sunrise and moon well-being isn't split", ManuscriptText.plainText(html));
        assertEquals(6, ManuscriptText.wordCount(html));
        Chapter chapter = new Chapter(); chapter.setContent(html); chapter.updateWordCount();
        assertEquals(6, chapter.getWordCount());
        PublishedChapterView.capture(chapter);
        assertEquals(6, chapter.getPublishedWordCount());
    }
    @Test void emptyMarkupAndNonbreakingSpacesContainNoWords() {
        assertEquals(0, ManuscriptText.wordCount("<p><br>&nbsp; &#160;</p>"));
        assertEquals(0, ManuscriptText.wordCount(null));
    }
}
