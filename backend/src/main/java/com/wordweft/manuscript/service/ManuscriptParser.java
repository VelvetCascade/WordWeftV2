package com.wordweft.manuscript.service;

import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class ManuscriptParser {
    private static final int MAX_CHAPTERS = 200;
    private static final int MAX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
    private static final int MAX_RELS_XML_BYTES = 2 * 1024 * 1024;
    private static final int MAX_MEDIA_FILE_BYTES = 10 * 1024 * 1024;

    private static final Pattern CONVENTIONAL_HEADING = Pattern.compile(
            "(?i)^(?:(?:chapter|part|act|book)\\s+(?:[0-9ivxlcdm]+|[a-z]+(?:[\\s-][a-z]+)*)|prologue|epilogue|[0-9]{1,3}\\s*[:—–\\.-])(?:\\s*[:—–\\.-]\\s*.*)?$");

    @FunctionalInterface
    public interface ImageUploader {
        String uploadImage(byte[] imageBytes, String originalFilename);
    }

    public record ImportedChapter(String title, String content) {}
    private record Paragraph(String htmlContent, String plainText, boolean heading) {}

    public List<ImportedChapter> parse(String filename, byte[] bytes) {
        return parse(filename, bytes, null);
    }

    public List<ImportedChapter> parse(String filename, byte[] bytes, ImageUploader imageUploader) {
        if (filename == null || filename.isBlank() || bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Choose a non-empty manuscript file.");
        }
        String extension = extension(filename);
        List<Paragraph> paragraphs = switch (extension) {
            case "txt", "md", "markdown" -> textParagraphs(decodeUtf8(bytes));
            case "docx" -> docxParagraphs(bytes, imageUploader);
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
        String normalized = source.replace("\r\n", "\n").replace('\r', '\n');
        String[] blocks = normalized.split("\n\\s*\n+");

        for (String block : blocks) {
            String trimmedBlock = block.trim();
            if (trimmedBlock.isEmpty()) continue;

            String[] lines = trimmedBlock.split("\n");
            StringBuilder currentPara = new StringBuilder();

            for (String rawLine : lines) {
                String line = rawLine.trim();
                if (line.isEmpty()) continue;

                boolean markdownHeading = line.matches("^#{1,3}\\s+.+$");
                String text = markdownHeading ? line.replaceFirst("^#{1,3}\\s+", "").trim() : line;
                boolean heading = markdownHeading || isConventionalHeading(text);

                if (heading) {
                    if (currentPara.length() > 0) {
                        String paraText = currentPara.toString();
                        result.add(new Paragraph("<p>" + escapeHtml(paraText) + "</p>", paraText, false));
                        currentPara.setLength(0);
                    }
                    result.add(new Paragraph(null, text, true));
                } else {
                    if (currentPara.length() > 0) {
                        currentPara.append(' ');
                    }
                    currentPara.append(line);
                }
            }

            if (currentPara.length() > 0) {
                String paraText = currentPara.toString();
                result.add(new Paragraph("<p>" + escapeHtml(paraText) + "</p>", paraText, false));
            }
        }
        return result;
    }

    private List<Paragraph> docxParagraphs(byte[] bytes, ImageUploader imageUploader) {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            byte[] documentXml = null;
            byte[] relsXml = null;
            Map<String, byte[]> mediaFiles = new HashMap<>();

            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName().replace('\\', '/');
                while (name.startsWith("/")) name = name.substring(1);
                String lowerName = name.toLowerCase(Locale.ROOT);

                if (lowerName.equals("word/document.xml")) {
                    documentXml = zip.readNBytes(MAX_DOCUMENT_XML_BYTES + 1);
                    if (documentXml.length > MAX_DOCUMENT_XML_BYTES) {
                        throw new IllegalArgumentException("The DOCX document is too large to import safely.");
                    }
                } else if (lowerName.equals("word/_rels/document.xml.rels")) {
                    relsXml = zip.readNBytes(MAX_RELS_XML_BYTES + 1);
                } else if (lowerName.startsWith("word/media/")) {
                    byte[] mediaBytes = zip.readNBytes(MAX_MEDIA_FILE_BYTES);
                    mediaFiles.put(lowerName, mediaBytes);
                }
            }

            if (documentXml == null) {
                throw new IllegalArgumentException("The DOCX file does not contain a readable document.");
            }

            Map<String, String> relIdToMediaPath = parseRelsXml(relsXml);
            return parseDocumentXml(documentXml, relIdToMediaPath, mediaFiles, imageUploader);
        } catch (IllegalArgumentException error) {
            throw error;
        } catch (Exception error) {
            throw new IllegalArgumentException("The DOCX file could not be read.", error);
        }
    }

    private Map<String, String> parseRelsXml(byte[] relsXml) {
        Map<String, String> relMap = new HashMap<>();
        if (relsXml == null || relsXml.length == 0) return relMap;

        try {
            Document doc = createSecureDocumentBuilder().parse(new InputSource(new ByteArrayInputStream(relsXml)));
            NodeList relationships = doc.getElementsByTagNameNS("*", "Relationship");
            if (relationships.getLength() == 0) {
                relationships = doc.getElementsByTagName("Relationship");
            }
            for (int i = 0; i < relationships.getLength(); i++) {
                Element rel = (Element) relationships.item(i);
                String id = rel.getAttribute("Id");
                String target = rel.getAttribute("Target");
                if (id != null && !id.isBlank() && target != null && !target.isBlank()) {
                    String norm = target.replace('\\', '/');
                    while (norm.startsWith("/")) norm = norm.substring(1);
                    if (norm.startsWith("../")) norm = norm.substring(3);
                    if (!norm.startsWith("word/")) norm = "word/" + norm;
                    relMap.put(id, norm.toLowerCase(Locale.ROOT));
                }
            }
        } catch (Exception ignored) {
            // Best-effort relationship parsing
        }
        return relMap;
    }

    private List<Paragraph> parseDocumentXml(
            byte[] xml,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader) throws Exception {

        Document document = createSecureDocumentBuilder().parse(new InputSource(new ByteArrayInputStream(xml)));
        NodeList paragraphNodes = document.getElementsByTagNameNS("*", "p");
        List<Paragraph> paragraphs = new ArrayList<>();

        for (int index = 0; index < paragraphNodes.getLength(); index++) {
            Element paragraph = (Element) paragraphNodes.item(index);
            String plainText = wordText(paragraph).trim();
            List<String> imageUrls = extractParagraphImages(paragraph, relIdToMediaPath, mediaFiles, imageUploader);

            if (plainText.isEmpty() && imageUrls.isEmpty()) continue;

            String style = paragraphStyle(paragraph).toLowerCase(Locale.ROOT);
            boolean heading = style.startsWith("heading") || style.equals("title") || isConventionalHeading(plainText);

            if (heading && imageUrls.isEmpty()) {
                paragraphs.add(new Paragraph(null, plainText, true));
            } else {
                StringBuilder html = new StringBuilder();
                if (!plainText.isEmpty()) {
                    html.append("<p>").append(escapeHtml(plainText)).append("</p>");
                }
                for (String imgUrl : imageUrls) {
                    html.append("<p class=\"chapter-image-container\"><img src=\"")
                            .append(escapeHtml(imgUrl))
                            .append("\" alt=\"Chapter illustration\" class=\"chapter-image\" loading=\"lazy\" /></p>");
                }
                paragraphs.add(new Paragraph(html.toString(), plainText, false));
            }
        }
        return paragraphs;
    }

    private List<String> extractParagraphImages(
            Element paragraph,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader) {

        List<String> urls = new ArrayList<>();
        if (relIdToMediaPath.isEmpty() || mediaFiles.isEmpty()) return urls;

        NodeList elements = paragraph.getElementsByTagName("*");
        for (int i = 0; i < elements.getLength(); i++) {
            Element el = (Element) elements.item(i);
            String tag = el.getLocalName() != null ? el.getLocalName().toLowerCase(Locale.ROOT) : el.getTagName().toLowerCase(Locale.ROOT);

            String relId = null;
            if (tag.endsWith("blip")) {
                if (el.hasAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed")) {
                    relId = el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
                } else if (el.hasAttribute("r:embed")) {
                    relId = el.getAttribute("r:embed");
                }
            } else if (tag.endsWith("imagedata")) {
                if (el.hasAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")) {
                    relId = el.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
                } else if (el.hasAttribute("r:id")) {
                    relId = el.getAttribute("r:id");
                } else if (el.hasAttribute("id") && el.getAttribute("id").startsWith("rId")) {
                    relId = el.getAttribute("id");
                }
            }

            if (relId != null && !relId.isBlank()) {
                String mediaPath = relIdToMediaPath.get(relId);
                if (mediaPath != null && mediaFiles.containsKey(mediaPath)) {
                    byte[] mediaBytes = mediaFiles.get(mediaPath);
                    if (isValidImageBytes(mediaBytes)) {
                        String origName = mediaPath.substring(mediaPath.lastIndexOf('/') + 1);
                        if (imageUploader != null) {
                            try {
                                String url = imageUploader.uploadImage(mediaBytes, origName);
                                if (url != null && !url.isBlank()) {
                                    urls.add(url);
                                }
                            } catch (Exception e) {
                                // If image upload fails, don't crash whole manuscript import
                            }
                        }
                    }
                }
            }
        }
        return urls;
    }

    private boolean isValidImageBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 8) return false;
        // JPEG: FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) return true;
        // PNG: 89 50 4E 47
        if ((bytes[0] & 0xFF) == 0x89 && (bytes[1] & 0xFF) == 0x50 && (bytes[2] & 0xFF) == 0x4E && (bytes[3] & 0xFF) == 0x47) return true;
        // GIF: GIF8
        if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') return true;
        // WebP: RIFF...WEBP
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return true;
        return false;
    }

    private String wordText(Element paragraph) {
        StringBuilder text = new StringBuilder();
        NodeList nodes = paragraph.getElementsByTagNameNS("*", "t");
        if (nodes.getLength() == 0) {
            nodes = paragraph.getElementsByTagName("w:t");
        }
        for (int index = 0; index < nodes.getLength(); index++) {
            text.append(nodes.item(index).getTextContent());
        }
        return text.toString();
    }

    private String paragraphStyle(Element paragraph) {
        NodeList styles = paragraph.getElementsByTagNameNS("*", "pStyle");
        if (styles.getLength() == 0) {
            styles = paragraph.getElementsByTagName("w:pStyle");
        }
        if (styles.getLength() == 0) return "";
        Element style = (Element) styles.item(0);
        String value = style.getAttributeNS(
                "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "val");
        return value.isBlank() ? style.getAttribute("w:val") : value;
    }

    private List<ImportedChapter> buildChapters(List<Paragraph> paragraphs) {
        List<ImportedChapter> chapters = new ArrayList<>();
        boolean hasHeadings = paragraphs.stream().anyMatch(Paragraph::heading);

        String currentTitle = null;
        List<String> content = new ArrayList<>();

        for (Paragraph paragraph : paragraphs) {
            if (paragraph.heading()) {
                flush(chapters, currentTitle, content, hasHeadings);
                currentTitle = safeTitle(paragraph.plainText());
                content = new ArrayList<>();
            } else {
                content.add(paragraph.htmlContent());
            }
        }
        flush(chapters, currentTitle, content, hasHeadings);
        return chapters;
    }

    private void flush(List<ImportedChapter> chapters, String title, List<String> paragraphs, boolean hasHeadings) {
        if (paragraphs.isEmpty()) return;

        // Front matter check: if there is text before the first heading and there ARE headings in the manuscript,
        // check whether it's brief front matter (< 200 words). If so, discard so it doesn't create a fake "Chapter 1"
        // that shifts all real chapters.
        if (title == null && hasHeadings) {
            String combinedText = String.join(" ", paragraphs).replaceAll("<[^>]*>", " ").trim();
            int wordCount = combinedText.isEmpty() ? 0 : combinedText.split("\\s+").length;
            if (wordCount < 200) {
                return;
            }
        }

        String finalTitle = title == null || title.isBlank()
                ? "Imported chapter " + (chapters.size() + 1)
                : title;
        String html = String.join("", paragraphs);
        chapters.add(new ImportedChapter(finalTitle, html));
    }

    private boolean isConventionalHeading(String value) {
        return CONVENTIONAL_HEADING.matcher(value.trim()).matches();
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
        if (bytes == null || bytes.length == 0) return "";

        // Strip UTF-8 BOM if present
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xEF && (bytes[1] & 0xFF) == 0xBB && (bytes[2] & 0xFF) == 0xBF) {
            bytes = Arrays.copyOfRange(bytes, 3, bytes.length);
        }

        // Try strict UTF-8
        try {
            String s = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
            return stripLeadingBom(s);
        } catch (CharacterCodingException ignored) {
            // Fall back to Windows-1252 (ANSI) for smart quotes, em dashes from Word/Notepad
            try {
                String win = Charset.forName("windows-1252").newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT)
                        .decode(ByteBuffer.wrap(bytes)).toString();
                return stripLeadingBom(win);
            } catch (Exception fallback) {
                // Final fallback: standard String constructor replaces malformed/unmappable bytes safely
                return stripLeadingBom(new String(bytes, StandardCharsets.UTF_8));
            }
        }
    }

    private String stripLeadingBom(String s) {
        if (s != null && s.startsWith("\uFEFF")) {
            return s.substring(1);
        }
        return s;
    }

    private String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private DocumentBuilder createSecureDocumentBuilder() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        return factory.newDocumentBuilder();
    }
}
