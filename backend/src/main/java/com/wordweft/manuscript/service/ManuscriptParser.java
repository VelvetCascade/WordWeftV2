package com.wordweft.manuscript.service;

import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class ManuscriptParser {
    private static final int MAX_CHAPTERS = 200;
    private static final int MAX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
    private static final Pattern CONVENTIONAL_HEADING = Pattern.compile(
            "(?i)^(chapter\\s+(?:[0-9ivxlcdm]+|[a-z]+)(?:\\s*[:—–-].*)?|prologue(?:\\s*[:—–-].*)?|epilogue(?:\\s*[:—–-].*)?)$");

    public record ImportedChapter(String title, String content) {}
    private record Paragraph(String text, boolean heading) {}

    public List<ImportedChapter> parse(String filename, byte[] bytes) {
        if (filename == null || filename.isBlank() || bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Choose a non-empty manuscript file.");
        }
        String extension = extension(filename);
        List<Paragraph> paragraphs = switch (extension) {
            case "txt", "md", "markdown" -> textParagraphs(decodeUtf8(bytes));
            case "docx" -> docxParagraphs(bytes);
            default -> throw new IllegalArgumentException("Import a .txt, .md, or .docx manuscript.");
        };
        List<ImportedChapter> chapters = buildChapters(paragraphs);
        if (chapters.isEmpty()) {
            throw new IllegalArgumentException("The manuscript does not contain readable text.");
        }
        if (chapters.size() > MAX_CHAPTERS) {
            throw new IllegalArgumentException("A manuscript can contain at most 200 chapters per import.");
        }
        return chapters;
    }

    private List<Paragraph> textParagraphs(String source) {
        List<Paragraph> result = new ArrayList<>();
        for (String rawLine : source.replace("\r\n", "\n").replace('\r', '\n').split("\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) continue;
            boolean markdownHeading = line.matches("^#{1,3}\\s+.+$");
            String text = markdownHeading ? line.replaceFirst("^#{1,3}\\s+", "").trim() : line;
            result.add(new Paragraph(text, markdownHeading || isConventionalHeading(text)));
        }
        return result;
    }

    private List<Paragraph> docxParagraphs(byte[] bytes) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!"word/document.xml".equals(entry.getName())) continue;
                byte[] xml = zip.readNBytes(MAX_DOCUMENT_XML_BYTES + 1);
                if (xml.length > MAX_DOCUMENT_XML_BYTES) {
                    throw new IllegalArgumentException("The DOCX document is too large to import safely.");
                }
                return parseDocumentXml(xml);
            }
            throw new IllegalArgumentException("The DOCX file does not contain a readable document.");
        } catch (IllegalArgumentException error) {
            throw error;
        } catch (Exception error) {
            throw new IllegalArgumentException("The DOCX file could not be read.", error);
        }
    }

    private List<Paragraph> parseDocumentXml(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        Document document = factory.newDocumentBuilder().parse(new InputSource(new ByteArrayInputStream(xml)));
        NodeList paragraphNodes = document.getElementsByTagNameNS("*", "p");
        List<Paragraph> paragraphs = new ArrayList<>();
        for (int index = 0; index < paragraphNodes.getLength(); index++) {
            Element paragraph = (Element) paragraphNodes.item(index);
            String text = wordText(paragraph).trim();
            if (text.isEmpty()) continue;
            String style = paragraphStyle(paragraph).toLowerCase(Locale.ROOT);
            boolean heading = style.startsWith("heading") || style.equals("title") || isConventionalHeading(text);
            paragraphs.add(new Paragraph(text, heading));
        }
        return paragraphs;
    }

    private String wordText(Element paragraph) {
        StringBuilder text = new StringBuilder();
        NodeList nodes = paragraph.getElementsByTagNameNS("*", "t");
        for (int index = 0; index < nodes.getLength(); index++) {
            if (!text.isEmpty()) text.append(' ');
            text.append(nodes.item(index).getTextContent());
        }
        return text.toString();
    }

    private String paragraphStyle(Element paragraph) {
        NodeList styles = paragraph.getElementsByTagNameNS("*", "pStyle");
        if (styles.getLength() == 0) return "";
        Element style = (Element) styles.item(0);
        String value = style.getAttributeNS(
                "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val");
        return value.isBlank() ? style.getAttribute("w:val") : value;
    }

    private List<ImportedChapter> buildChapters(List<Paragraph> paragraphs) {
        List<ImportedChapter> chapters = new ArrayList<>();
        String currentTitle = null;
        List<String> content = new ArrayList<>();
        for (Paragraph paragraph : paragraphs) {
            if (paragraph.heading()) {
                flush(chapters, currentTitle, content);
                currentTitle = safeTitle(paragraph.text());
                content = new ArrayList<>();
            } else {
                content.add(paragraph.text());
            }
        }
        flush(chapters, currentTitle, content);
        return chapters;
    }

    private void flush(List<ImportedChapter> chapters, String title, List<String> paragraphs) {
        if (paragraphs.isEmpty()) return;
        String finalTitle = title == null || title.isBlank()
                ? "Imported chapter " + (chapters.size() + 1)
                : title;
        String html = paragraphs.stream()
                .map(text -> "<p>" + escapeHtml(text) + "</p>")
                .reduce((left, right) -> left + right)
                .orElse("");
        chapters.add(new ImportedChapter(finalTitle, html));
    }

    private boolean isConventionalHeading(String value) {
        return CONVENTIONAL_HEADING.matcher(value).matches();
    }

    private String safeTitle(String value) {
        String trimmed = value.strip();
        return trimmed.length() <= 100 ? trimmed : trimmed.substring(0, 100);
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String decodeUtf8(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException invalidText) {
            throw new IllegalArgumentException("Text manuscripts must use UTF-8 encoding.");
        }
    }

    private String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
