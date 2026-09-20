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
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
public class ManuscriptParser {
    private static final int MAX_CHAPTERS = 200;
    private static final int MAX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;
    private static final int MAX_RELS_XML_BYTES = 2 * 1024 * 1024;
    private static final int MAX_MEDIA_FILE_BYTES = 5 * 1024 * 1024;

    private static final Pattern CONVENTIONAL_HEADING = Pattern.compile(
            "(?i)^(?:(?:chapter|part|act|book)\\s+(?:[0-9ivxlcdm]+|[a-z]+(?:[\\s-][a-z]+)*)|prologue|epilogue|[0-9]{1,3}\\s*[:—–\\.-])(?:\\s*[:—–\\.-]\\s*.*)?$");
    private static final Pattern CHARACTER_CANDIDATE = Pattern.compile("\\b[A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]{2,})?\\b");
    private static final Set<String> CHARACTER_STOP_WORDS = Set.of(
            "The", "This", "That", "Then", "When", "Where", "What", "Chapter", "Part", "Book",
            "Prologue", "Epilogue", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

    @FunctionalInterface
    public interface ImageUploader {
        String uploadImage(byte[] imageBytes, String originalFilename);
    }

    public record ImportedChapter(String title, String content) {}
    public record ParseResult(
            List<ImportedChapter> chapters,
            int embeddedImages,
            int uploadedImages,
            List<String> characterCandidates) {}
    public static class ImageUploadException extends RuntimeException {
        public ImageUploadException(String message) { super(message); }
        public ImageUploadException(String message, Throwable cause) { super(message, cause); }
    }
    private record Paragraph(
            String htmlContent,
            String plainText,
            boolean heading,
            int headingLevel,
            boolean richContent,
            boolean separator) {}

    public List<ImportedChapter> parse(String filename, byte[] bytes) {
        return parse(filename, bytes, null);
    }

    public List<ImportedChapter> parse(String filename, byte[] bytes, ImageUploader imageUploader) {
        return parseDetailed(filename, bytes, imageUploader).chapters();
    }

    public ParseResult parseDetailed(String filename, byte[] bytes, ImageUploader imageUploader) {
        if (filename == null || filename.isBlank() || bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Choose a non-empty manuscript file.");
        }
        String extension = extension(filename);
        int[] imageCounts = new int[] { 0, 0 };
        List<Paragraph> paragraphs = switch (extension) {
            case "txt", "md", "markdown" -> textParagraphs(decodeUtf8(bytes));
            case "docx" -> docxParagraphs(bytes, imageUploader, imageCounts);
            default -> throw new IllegalArgumentException("Import a .txt, .md, or .docx manuscript.");
        };
        List<ImportedChapter> chapters = buildChapters(paragraphs);
        if (chapters.isEmpty()) {
            throw new IllegalArgumentException("The manuscript does not contain readable text.");
        }
        if (chapters.size() > MAX_CHAPTERS) {
            throw new IllegalArgumentException("A manuscript can contain at most 200 chapters per import.");
        }
        return new ParseResult(chapters, imageCounts[0], imageCounts[1], characterCandidates(chapters));
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
                        result.add(new Paragraph("<p>" + escapeHtml(paraText) + "</p>", paraText, false, 0, false, false));
                        currentPara.setLength(0);
                    }
                    result.add(new Paragraph(null, text, true, 1, false, false));
                } else {
                    if (currentPara.length() > 0) {
                        currentPara.append(' ');
                    }
                    currentPara.append(line);
                }
            }

            if (currentPara.length() > 0) {
                String paraText = currentPara.toString();
                result.add(new Paragraph("<p>" + escapeHtml(paraText) + "</p>", paraText, false, 0, false, false));
            }
        }
        return result;
    }

    private List<Paragraph> docxParagraphs(byte[] bytes, ImageUploader imageUploader, int[] imageCounts) {
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
                    byte[] mediaBytes = zip.readNBytes(MAX_MEDIA_FILE_BYTES + 1);
                    if (mediaBytes.length > MAX_MEDIA_FILE_BYTES) {
                        String mediaName = name.substring(name.lastIndexOf('/') + 1);
                        throw new ImageUploadException(
                                "Embedded image " + mediaName + " exceeds the 5 MB image limit.");
                    }
                    mediaFiles.put(lowerName, mediaBytes);
                }
            }

            if (documentXml == null) {
                throw new IllegalArgumentException("The DOCX file does not contain a readable document.");
            }

            Map<String, String> relIdToMediaPath = parseRelsXml(relsXml);
            return parseDocumentXml(documentXml, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
        } catch (ImageUploadException error) {
            throw error;
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
            ImageUploader imageUploader,
            int[] imageCounts) throws Exception {

        Document document = createSecureDocumentBuilder().parse(new InputSource(new ByteArrayInputStream(xml)));
        List<Paragraph> paragraphs = new ArrayList<>();
        NodeList bodies = document.getElementsByTagNameNS("*", "body");
        if (bodies.getLength() == 0) return paragraphs;

        appendDocumentBlocks(
                bodies.item(0), paragraphs, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
        return paragraphs;
    }

    private void appendDocumentBlocks(
            Node container,
            List<Paragraph> blocks,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader,
            int[] imageCounts) {

        NodeList children = container.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
            String tag = localName(child);
            if ("p".equals(tag)) {
                Paragraph parsed = parseDocxParagraph(
                        (Element) child, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
                if (parsed != null) blocks.add(parsed);
            } else if ("tbl".equals(tag)) {
                Paragraph table = parseDocxTable(
                        (Element) child, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
                if (table != null) blocks.add(table);
            } else if ("sdt".equals(tag) || "sdtcontent".equals(tag) || "customxml".equals(tag)) {
                appendDocumentBlocks(child, blocks, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
            }
        }
    }

    private Paragraph parseDocxParagraph(
            Element paragraph,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader,
            int[] imageCounts) {

        String plainText = wordText(paragraph).trim();
        List<String> imageUrls = extractParagraphImages(
                paragraph, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);

        if (plainText.isEmpty() && imageUrls.isEmpty() && !isHorizontalRule(paragraph)) return null;

        String style = paragraphStyle(paragraph).toLowerCase(Locale.ROOT);
        int headingLevel = headingLevel(style);
        boolean heading = headingLevel > 0 || style.equals("title") || isConventionalHeading(plainText);
        if (heading && imageUrls.isEmpty()) {
            return new Paragraph(null, plainText, true, headingLevel == 0 ? 1 : headingLevel, false, false);
        }

        if (isHorizontalRule(paragraph)) {
            return new Paragraph("<hr>", plainText, false, 0, false, true);
        }

        String inlineHtml = formattedParagraphText(paragraph);
        StringBuilder html = new StringBuilder();
        if (!inlineHtml.isBlank()) {
            if (style.contains("quote")) {
                html.append("<blockquote><p>").append(inlineHtml).append("</p></blockquote>");
            } else if (isListParagraph(paragraph, style)) {
                String listTag = style.contains("number") ? "ol" : "ul";
                html.append('<').append(listTag).append("><li><p>")
                        .append(inlineHtml).append("</p></li></").append(listTag).append('>');
            } else {
                html.append("<p>").append(inlineHtml).append("</p>");
            }
        }
        for (String imgUrl : imageUrls) {
            html.append(chapterImageHtml(imgUrl));
        }
        return new Paragraph(html.toString(), plainText, false, 0, !imageUrls.isEmpty(), false);
    }

    private Paragraph parseDocxTable(
            Element table,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader,
            int[] imageCounts) {

        List<Element> rows = directChildren(table, "tr");
        if (rows.isEmpty()) return null;
        boolean headerRow = rows.size() > 1 && isLikelyHeaderRow(rows.get(0));
        StringBuilder html = new StringBuilder("<table><tbody>");
        StringBuilder plainText = new StringBuilder();

        for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
            html.append("<tr>");
            List<Element> cells = directChildren(rows.get(rowIndex), "tc");
            for (Element cell : cells) {
                String cellTag = headerRow && rowIndex == 0 ? "th" : "td";
                html.append('<').append(cellTag).append('>');
                List<Element> cellParagraphs = directChildren(cell, "p");
                if (cellParagraphs.isEmpty()) {
                    html.append("<p></p>");
                } else {
                    for (Element cellParagraph : cellParagraphs) {
                        String cellText = wordText(cellParagraph).trim();
                        String cellInline = formattedParagraphText(cellParagraph);
                        List<String> imageUrls = extractParagraphImages(
                                cellParagraph, relIdToMediaPath, mediaFiles, imageUploader, imageCounts);
                        if (!cellInline.isBlank()) html.append("<p>").append(cellInline).append("</p>");
                        for (String imageUrl : imageUrls) html.append(chapterImageHtml(imageUrl));
                        if (!cellText.isBlank()) {
                            if (plainText.length() > 0) plainText.append(' ');
                            plainText.append(cellText);
                        }
                    }
                }
                html.append("</").append(cellTag).append('>');
            }
            html.append("</tr>");
        }
        html.append("</tbody></table>");
        return new Paragraph(html.toString(), plainText.toString(), false, 0, true, false);
    }

    private boolean isLikelyHeaderRow(Element row) {
        if (hasDescendant(row, "tblHeader") || hasDescendant(row, "shd")) return true;
        List<Element> cells = directChildren(row, "tc");
        if (cells.isEmpty()) return false;
        boolean everyCellIsBrief = true;
        boolean hasBoldText = false;
        for (Element cell : cells) {
            String text = wordText(cell).trim();
            everyCellIsBrief &= !text.isBlank() && text.length() <= 80;
            hasBoldText |= hasDescendant(cell, "b");
        }
        return everyCellIsBrief && hasBoldText;
    }

    private String formattedParagraphText(Element paragraph) {
        StringBuilder html = new StringBuilder();
        appendFormattedRuns(paragraph, html);
        return html.toString().trim();
    }

    private void appendFormattedRuns(Node container, StringBuilder html) {
        NodeList children = container.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
            String tag = localName(child);
            if ("r".equals(tag)) {
                appendFormattedRun((Element) child, html);
            } else if ("hyperlink".equals(tag) || "smarttag".equals(tag) || "sdt".equals(tag)
                    || "sdtcontent".equals(tag) || "ins".equals(tag)) {
                appendFormattedRuns(child, html);
            }
        }
    }

    private void appendFormattedRun(Element run, StringBuilder html) {
        StringBuilder content = new StringBuilder();
        NodeList children = run.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() != Node.ELEMENT_NODE) continue;
            switch (localName(child)) {
                case "t", "deltext" -> content.append(escapeHtml(child.getTextContent()));
                case "tab" -> content.append("&nbsp;&nbsp;&nbsp;&nbsp;");
                case "br", "cr" -> content.append("<br>");
                default -> { }
            }
        }
        if (content.isEmpty()) return;

        Element properties = firstDirectChild(run, "rPr");
        String value = content.toString();
        if (properties != null) {
            if (enabledProperty(properties, "b")) value = "<strong>" + value + "</strong>";
            if (enabledProperty(properties, "i")) value = "<em>" + value + "</em>";
            if (enabledProperty(properties, "u")) value = "<u>" + value + "</u>";
            if (enabledProperty(properties, "strike") || enabledProperty(properties, "dstrike")) {
                value = "<s>" + value + "</s>";
            }
        }
        html.append(value);
    }

    private boolean enabledProperty(Element properties, String localName) {
        Element property = firstDirectChild(properties, localName);
        if (property == null) return false;
        String value = wordAttribute(property, "val").toLowerCase(Locale.ROOT);
        return !Set.of("false", "0", "none", "off").contains(value);
    }

    private boolean isListParagraph(Element paragraph, String style) {
        return style.contains("list") || hasDescendant(paragraph, "numPr");
    }

    private boolean isHorizontalRule(Element paragraph) {
        String text = wordText(paragraph).trim();
        if (text.matches("(?:-{3,}|_{3,}|\\*{3,})")) return true;
        return hasDescendant(paragraph, "pBdr");
    }

    private int headingLevel(String style) {
        if (!style.startsWith("heading")) return 0;
        String suffix = style.substring("heading".length()).replaceAll("[^0-9]", "");
        if (suffix.isBlank()) return 1;
        try {
            return Math.max(1, Math.min(6, Integer.parseInt(suffix)));
        } catch (NumberFormatException ignored) {
            return 1;
        }
    }

    private String chapterImageHtml(String imageUrl) {
        return "<p class=\"chapter-image-container\"><img src=\"" + escapeHtml(imageUrl)
                + "\" alt=\"Chapter illustration\" class=\"chapter-image\" loading=\"lazy\" /></p>";
    }

    private List<Element> directChildren(Element parent, String wantedLocalName) {
        List<Element> result = new ArrayList<>();
        String wanted = wantedLocalName.toLowerCase(Locale.ROOT);
        NodeList children = parent.getChildNodes();
        for (int index = 0; index < children.getLength(); index++) {
            Node child = children.item(index);
            if (child.getNodeType() == Node.ELEMENT_NODE && wanted.equals(localName(child))) {
                result.add((Element) child);
            }
        }
        return result;
    }

    private Element firstDirectChild(Element parent, String wantedLocalName) {
        List<Element> children = directChildren(parent, wantedLocalName);
        return children.isEmpty() ? null : children.get(0);
    }

    private boolean hasDescendant(Element parent, String wantedLocalName) {
        NodeList nodes = parent.getElementsByTagNameNS("*", wantedLocalName);
        if (nodes.getLength() > 0) return true;
        return parent.getElementsByTagName("w:" + wantedLocalName).getLength() > 0;
    }

    private String localName(Node node) {
        String name = node.getLocalName();
        if (name != null) return name.toLowerCase(Locale.ROOT);
        String fallback = node.getNodeName();
        int colon = fallback.indexOf(':');
        return (colon >= 0 ? fallback.substring(colon + 1) : fallback).toLowerCase(Locale.ROOT);
    }

    private String wordAttribute(Element element, String name) {
        String value = element.getAttributeNS(
                "http://schemas.openxmlformats.org/wordprocessingml/2006/main", name);
        return value.isBlank() ? element.getAttribute("w:" + name) : value;
    }

    private List<String> extractParagraphImages(
            Element paragraph,
            Map<String, String> relIdToMediaPath,
            Map<String, byte[]> mediaFiles,
            ImageUploader imageUploader,
            int[] imageCounts) {

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
                    imageCounts[0]++;
                    byte[] mediaBytes = mediaFiles.get(mediaPath);
                    if (isValidImageBytes(mediaBytes)) {
                        String origName = mediaPath.substring(mediaPath.lastIndexOf('/') + 1);
                        if (imageUploader == null) {
                            throw new ImageUploadException(
                                    "Image storage is not configured, so embedded image " + origName + " was not imported.");
                        }
                        try {
                            String url = imageUploader.uploadImage(mediaBytes, origName);
                            if (url == null || url.isBlank()) {
                                throw new ImageUploadException(
                                        "Image storage returned no URL for embedded image " + origName + ".");
                            }
                            urls.add(url);
                            imageCounts[1]++;
                        } catch (ImageUploadException error) {
                            throw error;
                        } catch (Exception error) {
                            throw new ImageUploadException(
                                    "Embedded image " + origName + " could not be uploaded. No chapters were imported.", error);
                        }
                    } else {
                        String origName = mediaPath.substring(mediaPath.lastIndexOf('/') + 1);
                        throw new ImageUploadException(
                                "Embedded image " + origName + " uses an unsupported or invalid image format.");
                    }
                }
            }
        }
        return urls;
    }

    private List<String> characterCandidates(List<ImportedChapter> chapters) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (ImportedChapter chapter : chapters) {
            String text = chapter.content().replaceAll("<[^>]+>", " ")
                    .replace("&quot;", "\"").replace("&#39;", "'")
                    .replace("&amp;", "&").replaceAll("\\s+", " ");
            var matcher = CHARACTER_CANDIDATE.matcher(text);
            while (matcher.find()) {
                String candidate = matcher.group().trim();
                if (!CHARACTER_STOP_WORDS.contains(candidate)) counts.merge(candidate, 1, Integer::sum);
            }
        }
        return counts.entrySet().stream()
                .filter(entry -> entry.getValue() >= 2)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .limit(20)
                .map(Map.Entry::getKey)
                .toList();
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
        List<Paragraph> content = new ArrayList<>();

        for (Paragraph paragraph : paragraphs) {
            if (paragraph.heading()) {
                boolean precededBySeparator = !content.isEmpty() && content.get(content.size() - 1).separator();
                boolean startsChapter = currentTitle == null
                        || paragraph.headingLevel() <= 1
                        || isConventionalHeading(paragraph.plainText())
                        || precededBySeparator;
                if (!startsChapter) {
                    int level = Math.max(2, Math.min(3, paragraph.headingLevel()));
                    content.add(new Paragraph(
                            "<h" + level + ">" + escapeHtml(paragraph.plainText()) + "</h" + level + ">",
                            paragraph.plainText(), false, 0, false, false));
                    continue;
                }
                if (currentTitle == null && chapters.isEmpty() && hasHeadings && isBriefFrontMatter(content)) {
                    // Covers and other rich blocks immediately before the first chapter heading belong to
                    // that chapter. Plain title/copyright front matter is still omitted.
                    content = new ArrayList<>(content.stream().filter(Paragraph::richContent).toList());
                } else {
                    trimTrailingSeparators(content);
                    flush(chapters, currentTitle, content);
                    content = new ArrayList<>();
                }
                currentTitle = safeTitle(paragraph.plainText());
            } else {
                content.add(paragraph);
            }
        }
        trimTrailingSeparators(content);
        flush(chapters, currentTitle, content);
        return chapters;
    }

    private boolean isBriefFrontMatter(List<Paragraph> paragraphs) {
        String combinedText = paragraphs.stream()
                .map(Paragraph::plainText)
                .filter(value -> value != null && !value.isBlank())
                .reduce("", (left, right) -> left + " " + right)
                .trim();
        int wordCount = combinedText.isEmpty() ? 0 : combinedText.split("\\s+").length;
        return wordCount < 200;
    }

    private void trimTrailingSeparators(List<Paragraph> paragraphs) {
        while (!paragraphs.isEmpty() && paragraphs.get(paragraphs.size() - 1).separator()) {
            paragraphs.remove(paragraphs.size() - 1);
        }
    }

    private void flush(List<ImportedChapter> chapters, String title, List<Paragraph> paragraphs) {
        if (paragraphs.isEmpty()) return;

        String finalTitle = title == null || title.isBlank()
                ? "Imported chapter " + (chapters.size() + 1)
                : title;
        String html = paragraphs.stream().map(Paragraph::htmlContent).reduce("", String::concat);
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
