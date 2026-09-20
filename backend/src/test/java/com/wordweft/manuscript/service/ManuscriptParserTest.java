package com.wordweft.manuscript.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    void docxRunsDoNotInsertSpuriousSpacesInsideWords() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1</w:t></w:r></w:p>
                  <w:p>
                    <w:r><w:t>We don</w:t></w:r>
                    <w:r><w:t>'t</w:t></w:r>
                    <w:r><w:t> break words.</w:t></w:r>
                  </w:p>
                </w:body></w:document>
                """;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(document.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse("story.docx", bytes.toByteArray());

        assertEquals(1, chapters.size());
        assertTrue(chapters.get(0).content().contains("<p>We don&#39;t break words.</p>"));
        assertFalse(chapters.get(0).content().contains("don &#39; t"));
    }

    @Test
    void docxEmbeddedImagesAreExtractedAndUploaded() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <w:body>
                    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1: The Map</w:t></w:r></w:p>
                    <w:p>
                      <w:r><w:t>Here is the illustration:</w:t></w:r>
                    </w:p>
                    <w:p>
                      <w:r>
                        <w:drawing>
                          <a:blip r:embed="rId10"/>
                        </w:drawing>
                      </w:r>
                    </w:p>
                  </w:body>
                </w:document>
                """;

        String rels = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/map.png"/>
                </Relationships>
                """;

        byte[] fakePng = new byte[] { (byte)0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(document.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();

            zip.putNextEntry(new ZipEntry("word/_rels/document.xml.rels"));
            zip.write(rels.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();

            zip.putNextEntry(new ZipEntry("word/media/map.png"));
            zip.write(fakePng);
            zip.closeEntry();
        }

        ManuscriptParser.ImageUploader uploader = (imgBytes, filename) -> {
            assertEquals("map.png", filename);
            return "https://cdn.wordweft.com/chapter-images/book-1/map.png";
        };

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse("story.docx", bytes.toByteArray(), uploader);

        assertEquals(1, chapters.size());
        assertTrue(chapters.get(0).content().contains("https://cdn.wordweft.com/chapter-images/book-1/map.png"));
        assertTrue(chapters.get(0).content().contains("class=\"chapter-image\""));
    }

    @Test
    void imageBeforeFirstHeadingIsKeptInTheFirstImportedChapter() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>
                  <w:p><w:r><w:drawing><a:blip r:embed="rId5"/></w:drawing></w:r></w:p>
                  <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>And she cried</w:t></w:r></w:p>
                  <w:p><w:r><w:t>The opening paragraph.</w:t></w:r></w:p>
                </w:body></w:document>
                """;
        String rels = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.jpeg"/>
                </Relationships>
                """;
        byte[] jpeg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00 };

        ManuscriptParser.ParseResult result = parser.parseDetailed(
                "sample.docx",
                docx(document, rels, "word/media/image1.jpeg", jpeg),
                (bytes, filename) -> "https://cdn.wordweft.test/chapter-images/book/image1.jpg");

        assertEquals(1, result.chapters().size());
        assertEquals("And she cried", result.chapters().get(0).title());
        assertTrue(result.chapters().get(0).content().startsWith("<p class=\"chapter-image-container\">"));
        assertTrue(result.chapters().get(0).content().contains("image1.jpg"));
        assertEquals(1, result.embeddedImages());
        assertEquals(1, result.uploadedImages());
    }

    @Test
    void docxTablesQuotesAndInlineFormattingArePreservedAsEditorHtml() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1</w:t></w:r></w:p>
                  <w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t>Words worth keeping.</w:t></w:r></w:p>
                  <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:t> and </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>underlined</w:t></w:r></w:p>
                  <w:tbl>
                    <w:tr>
                      <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Name</w:t></w:r></w:p></w:tc>
                      <w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Role</w:t></w:r></w:p></w:tc>
                    </w:tr>
                    <w:tr>
                      <w:tc><w:p><w:r><w:t>Mira</w:t></w:r></w:p></w:tc>
                      <w:tc><w:p><w:r><w:t>Navigator</w:t></w:r></w:p></w:tc>
                    </w:tr>
                  </w:tbl>
                </w:body></w:document>
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "rich.docx", docx(document, null, null, null));

        assertEquals(1, chapters.size());
        String html = chapters.get(0).content();
        assertTrue(html.contains("<blockquote><p><em>Words worth keeping.</em></p></blockquote>"), html);
        assertTrue(html.contains("<strong>Bold</strong> and <u>underlined</u>"), html);
        assertTrue(html.contains("<table><tbody><tr><th><p><strong>Name</strong></p></th>"), html);
        assertTrue(html.contains("<td><p>Mira</p></td>"), html);
    }

    @Test
    void decorativeRuleIsPreservedButTrailingChapterSeparatorIsNot() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1</w:t></w:r></w:p>
                  <w:p><w:r><w:t>Opening.</w:t></w:r></w:p>
                  <w:p><w:r><w:t>---</w:t></w:r></w:p>
                  <w:p><w:r><w:t>Same chapter.</w:t></w:r></w:p>
                  <w:p><w:pPr><w:pBdr><w:bottom w:val="single"/></w:pBdr></w:pPr></w:p>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 2</w:t></w:r></w:p>
                  <w:p><w:r><w:t>Next chapter.</w:t></w:r></w:p>
                </w:body></w:document>
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "rules.docx", docx(document, null, null, null));

        assertEquals(2, chapters.size());
        assertTrue(chapters.get(0).content().contains("<hr><p>Same chapter.</p>"));
        assertFalse(chapters.get(0).content().endsWith("<hr>"));
    }

    @Test
    void secondaryHeadingInsideAChapterIsPreservedWithoutSplittingTheChapter() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1</w:t></w:r></w:p>
                  <w:p><w:r><w:t>Opening paragraph.</w:t></w:r></w:p>
                  <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>A change of scene</w:t></w:r></w:p>
                  <w:p><w:r><w:t>The story continues.</w:t></w:r></w:p>
                </w:body></w:document>
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "subheading.docx", docx(document, null, null, null));

        assertEquals(1, chapters.size());
        assertEquals("Chapter 1", chapters.get(0).title());
        assertTrue(chapters.get(0).content().contains("<h2>A change of scene</h2>"));
        assertTrue(chapters.get(0).content().contains("<p>The story continues.</p>"));
    }

    @Test
    void embeddedImageUploadFailureRejectsTheImportInsteadOfDroppingTheImage() throws Exception {
        ManuscriptParser.ImageUploadException error = assertThrows(ManuscriptParser.ImageUploadException.class, () -> parser.parse(
                "story.docx",
                embeddedImageDocx(),
                (bytes, filename) -> { throw new RuntimeException("storage unavailable"); }));

        assertTrue(error.getMessage().contains("map.png"));
        assertTrue(error.getMessage().toLowerCase().contains("image"));
    }

    @Test
    void embeddedImagesRequireConfiguredStorage() throws Exception {
        ManuscriptParser.ImageUploadException error = assertThrows(ManuscriptParser.ImageUploadException.class,
                () -> parser.parse("story.docx", embeddedImageDocx(), null));

        assertTrue(error.getMessage().toLowerCase().contains("storage"));
    }

    @Test
    void windows1252EncodingIsDecodedWithoutErrors() {
        // Windows-1252 bytes for curly quotes: 0x93 (“), 0x94 (”)
        byte[] bytes = new byte[] {
                '#', ' ', 'C', 'h', 'a', 'p', 't', 'e', 'r', ' ', '1', '\n',
                (byte) 0x93, 'H', 'e', 'l', 'l', 'o', (byte) 0x94, ' ', 'w', 'o', 'r', 'l', 'd', '.'
        };

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse("story.txt", bytes);
        assertEquals(1, chapters.size());
        assertTrue(chapters.get(0).content().contains("Hello"));
    }

    @Test
    void utf8BomIsStrippedWithoutBreakingHeading() {
        byte[] bom = new byte[] { (byte) 0xEF, (byte) 0xBB, (byte) 0xBF };
        byte[] text = "Chapter 1. The Journey\nFirst line of text.".getBytes(StandardCharsets.UTF_8);
        byte[] combined = new byte[bom.length + text.length];
        System.arraycopy(bom, 0, combined, 0, bom.length);
        System.arraycopy(text, 0, combined, bom.length, text.length);

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse("story.txt", combined);
        assertEquals(1, chapters.size());
        assertEquals("Chapter 1. The Journey", chapters.get(0).title());
    }

    @Test
    void enhancedHeadingFormatsAreRecognized() {
        String source = """
                Chapter 1. The Beginning
                First paragraph.
                
                Chapter Twenty-One: The Turning Point
                Second paragraph.
                
                Part 2: The Return
                Third paragraph.
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "story.txt", source.getBytes(StandardCharsets.UTF_8));

        assertEquals(3, chapters.size());
        assertEquals("Chapter 1. The Beginning", chapters.get(0).title());
        assertEquals("Chapter Twenty-One: The Turning Point", chapters.get(1).title());
        assertEquals("Part 2: The Return", chapters.get(2).title());
    }

    @Test
    void hardWrappedLinesAreJoinedIntoSingleParagraphs() {
        String source = """
                Chapter 1
                This is a line that was
                hard-wrapped across multiple
                lines by an author's text editor.
                
                This is the second paragraph.
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "story.txt", source.getBytes(StandardCharsets.UTF_8));

        assertEquals(1, chapters.size());
        assertTrue(chapters.get(0).content().contains("<p>This is a line that was hard-wrapped across multiple lines by an author&#39;s text editor.</p>"));
        assertTrue(chapters.get(0).content().contains("<p>This is the second paragraph.</p>"));
    }

    @Test
    void briefFrontMatterBeforeChapterOneDoesNotCreatePhantomChapter() {
        String source = """
                My Great Novel
                By Jane Doe
                Copyright 2026
                
                Chapter 1
                The story actually begins here.
                
                Chapter 2
                The story continues here.
                """;

        List<ManuscriptParser.ImportedChapter> chapters = parser.parse(
                "story.txt", source.getBytes(StandardCharsets.UTF_8));

        assertEquals(2, chapters.size());
        assertEquals("Chapter 1", chapters.get(0).title());
        assertEquals("Chapter 2", chapters.get(1).title());
    }

    @Test
    void emptyAndUnsupportedFilesAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("empty.txt", new byte[0]));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("story.pdf", "data".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void repeatedProperNamesBecomeConservativeCharacterCandidates() {
        ManuscriptParser.ParseResult result = parser.parseDetailed(
                "story.txt",
                "Chapter 1\nMira crossed the bridge. Mira called for Rowan. Rowan answered Mira."
                        .getBytes(StandardCharsets.UTF_8),
                null);

        assertTrue(result.characterCandidates().contains("Mira"));
        assertTrue(result.characterCandidates().contains("Rowan"));
        assertEquals(0, result.embeddedImages());
    }

    private static byte[] embeddedImageDocx() throws Exception {
        String document = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>
                  <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Chapter 1</w:t></w:r></w:p>
                  <w:p><w:r><w:t>Illustration</w:t><w:drawing><a:blip r:embed="rId10"/></w:drawing></w:r></w:p>
                </w:body></w:document>
                """;
        String rels = """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/map.png"/>
                </Relationships>
                """;
        byte[] png = new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00 };
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(document.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("word/_rels/document.xml.rels"));
            zip.write(rels.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("word/media/map.png"));
            zip.write(png);
            zip.closeEntry();
        }
        return bytes.toByteArray();
    }

    private static byte[] docx(String document, String rels, String mediaPath, byte[] media) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(document.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            if (rels != null) {
                zip.putNextEntry(new ZipEntry("word/_rels/document.xml.rels"));
                zip.write(rels.getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
            if (mediaPath != null && media != null) {
                zip.putNextEntry(new ZipEntry(mediaPath));
                zip.write(media);
                zip.closeEntry();
            }
        }
        return bytes.toByteArray();
    }
}
