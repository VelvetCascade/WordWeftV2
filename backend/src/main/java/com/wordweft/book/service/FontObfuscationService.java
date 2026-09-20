package com.wordweft.book.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.NodeVisitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FontObfuscationService {
    private static final Logger log = LoggerFactory.getLogger(FontObfuscationService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final int SEED_COUNT = 5;

    private final Map<String, Map<Character, Character>> encodeMaps = new ConcurrentHashMap<>();
    private final Map<String, Map<Character, Character>> decodeMaps = new ConcurrentHashMap<>();

    public FontObfuscationService() {
        loadCipherMappings();
    }

    private void loadCipherMappings() {
        try {
            ClassPathResource resource = new ClassPathResource("cipherMappings.json");
            if (!resource.exists()) {
                log.warn("cipherMappings.json not found in classpath. Font obfuscation will be passthrough.");
                return;
            }
            try (InputStream is = resource.getInputStream()) {
                TypeReference<Map<String, SeedMappingJson>> typeRef = new TypeReference<>() {};
                Map<String, SeedMappingJson> data = objectMapper.readValue(is, typeRef);

                for (Map.Entry<String, SeedMappingJson> entry : data.entrySet()) {
                    String seedKey = entry.getKey();
                    SeedMappingJson mapping = entry.getValue();

                    Map<Character, Character> encodeMap = new HashMap<>();
                    for (Map.Entry<String, String> m : mapping.encodeMap.entrySet()) {
                        if (!m.getKey().isEmpty() && !m.getValue().isEmpty()) {
                            encodeMap.put(m.getKey().charAt(0), m.getValue().charAt(0));
                        }
                    }
                    encodeMaps.put(seedKey, encodeMap);

                    Map<Character, Character> decodeMap = new HashMap<>();
                    for (Map.Entry<String, String> m : mapping.decodeMap.entrySet()) {
                        if (!m.getKey().isEmpty() && !m.getValue().isEmpty()) {
                            decodeMap.put(m.getKey().charAt(0), m.getValue().charAt(0));
                        }
                    }
                    decodeMaps.put(seedKey, decodeMap);
                }
                log.info("Loaded {} cipher seed mapping tables successfully.", encodeMaps.size());
            }
        } catch (Exception e) {
            log.error("Failed to load cipherMappings.json", e);
        }
    }

    private record SeedMappingJson(
            Map<String, String> encodeMap,
            Map<String, String> decodeMap) {}

    public String getSeedForChapter(String bookId, String chapterId) {
        String key = (bookId != null ? bookId : "") + ":" + (chapterId != null ? chapterId : "");
        int hash = Math.abs(key.hashCode());
        int seedIndex = (hash % SEED_COUNT) + 1;
        return "ww-cipher-" + seedIndex;
    }

    public String obfuscateHtml(String html, String seedId) {
        if (html == null || html.isBlank()) {
            return html;
        }
        Map<Character, Character> map = encodeMaps.get(seedId);
        if (map == null || map.isEmpty()) {
            return html;
        }

        Document doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings().syntax(Document.OutputSettings.Syntax.html).prettyPrint(false);

        doc.body().traverse(new NodeVisitor() {
            @Override
            public void head(Node node, int depth) {
                if (node instanceof TextNode textNode) {
                    String orig = textNode.getWholeText();
                    String scrambled = obfuscateText(orig, map);
                    textNode.text(scrambled);
                }
            }

            @Override
            public void tail(Node node, int depth) {}
        });

        return org.jsoup.parser.Parser.unescapeEntities(doc.body().html(), false);
    }

    public String obfuscateText(String text, Map<Character, Character> map) {
        if (text == null || text.isEmpty()) return text;
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            Character mapped = map.get(c);
            sb.append(mapped != null ? mapped : c);
        }
        return sb.toString();
    }

    public String deobfuscate(String text, String seedId) {
        if (text == null || text.isEmpty()) return text;
        Map<Character, Character> map = decodeMaps.get(seedId);
        if (map == null || map.isEmpty()) return text;

        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            Character mapped = map.get(c);
            sb.append(mapped != null ? mapped : c);
        }
        return sb.toString();
    }

    public boolean isConfigured() {
        return !encodeMaps.isEmpty();
    }
}
