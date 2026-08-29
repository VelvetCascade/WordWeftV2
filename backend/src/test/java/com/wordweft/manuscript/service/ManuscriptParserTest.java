package com.wordweft.manuscript.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ManuscriptParserTest {
    private final ManuscriptParser parser = new ManuscriptParser();

    @Test
    void markdownHeadingsAndConventionalChapterLinesBecomeDraftChapters() {
        String source = "# Prologue\nA quiet beginning.\n\nChapter 1: Arrival\nThe train came in.\n\n## Chapter Two\nNight fell.";

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "story.md", source.getBytes(StandardCharsets.UTF_8));

        assertEquals(List.of("Prologue", "Chapter 1: Arrival", "Chapter Two"),
                chapters.stream().map(ManuscriptParser.ImportedChapter::title).toList());
        assertTrue(chapters.get(1).content().contains("<p>The train came in.</p>"));
    }

    @Test
    void unlabelledTextBecomesOneSafelyEscapedChapter() {
        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "notes.txt", "One <script>alert('x')</script> opening.".getBytes(StandardCharsets.UTF_8));

        assertEquals(1, chapters.size());
        assertEquals("Imported chapter 1", chapters.get(0).title());
        assertTrue(chapters.get(0).content().contains("&lt;script&gt;"));
    }

    @Test
    void docxHeadingStylesBecomeChapterBoundaries() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter One</w:t></w:r></w:p>
                  <w:p><w:r><w:t>The first paragraph.</w:t></w:r></w:p>
                  <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Chapter Two</w:t></w:r></w:p>
                  <w:p><w:r><w:t>The second paragraph.</w:t></w:r></w:p>
                </w:body></w:document>
                """;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(document.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse("story.docx", bytes.toByteArray());

        assertEquals(2, chapters.size());
        assertEquals("Chapter Two", chapters.get(1).title());
        assertTrue(chapters.get(1).content().contains("The second paragraph."));
    }

    @Test
    void emptyAndUnsupportedFilesAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("empty.txt", new byte[0]));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("story.pdf", "data".getBytes(StandardCharsets.UTF_8)));
    }
}
