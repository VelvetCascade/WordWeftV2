package com.wordweft.book.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FontObfuscationServiceTest {

    private FontObfuscationService service;

    @BeforeEach
    void setUp() {
        service = new FontObfuscationService();
    }

    @Test
    void cipherMappingsLoadSuccessfully() {
        assertTrue(service.isConfigured(), "Cipher mappings should be loaded from classpath");
    }

    @Test
    void seedSelectionIsDeterministic() {
        String seedA1 = service.getSeedForChapter("book-123", "chapter-1");
        String seedA2 = service.getSeedForChapter("book-123", "chapter-1");
        assertEquals(seedA1, seedA2, "Same book and chapter should always produce the same seed");
        assertTrue(seedA1.startsWith("ww-cipher-"), "Seed should follow ww-cipher-X naming convention");
    }

    @Test
    void obfuscationPreservesHtmlTagsAttributesAndImages() {
        String seed = service.getSeedForChapter("book-1", "chapter-1");
        String inputHtml = """
                <p id="paragraph-0" class="reader-copy">Hello World 123!</p>
                <p class="chapter-image-container"><img src="https://cdn.wordweft.com/chapter-images/book-1/img.webp" alt="Illustration" class="chapter-image" loading="lazy" /></p>
                <p id="paragraph-1"><span data-spoiler="true">Secret spoiler text</span></p>
                """;

        String obfuscated = service.obfuscateHtml(inputHtml, seed);

        // Verification 1: HTML structure and attributes are intact
        assertTrue(obfuscated.contains("id=\"paragraph-0\""), "Paragraph IDs must be preserved");
        assertTrue(obfuscated.contains("class=\"reader-copy\""), "Class attributes must be preserved");
        assertTrue(obfuscated.contains("src=\"https://cdn.wordweft.com/chapter-images/book-1/img.webp\""), "Image URLs must NOT be modified");
        assertTrue(obfuscated.contains("alt=\"Illustration\""), "Image alt attribute must be preserved");
        assertTrue(obfuscated.contains("loading=\"lazy\""), "Image loading attribute must be preserved");
        assertTrue(obfuscated.contains("data-spoiler=\"true\""), "Spoiler attributes must be preserved");

        // Verification 2: Plaintext words in text nodes are NO LONGER present in original ASCII form
        assertFalse(obfuscated.contains("Hello World 123"), "Original ASCII text must be scrambled in text nodes");
        assertFalse(obfuscated.contains("Secret spoiler text"), "Original spoiler text must be scrambled in text nodes");

        // Verification 3: Scrambled characters are in PUA range (0xE100 - 0xE13D)
        boolean hasPua = false;
        for (char c : obfuscated.toCharArray()) {
            if (c >= 0xE100 && c <= 0xE13D) {
                hasPua = true;
                break;
            }
        }
        assertTrue(hasPua, "Obfuscated HTML should contain PUA glyph characters");
    }

    @Test
    void textDeobfuscatesWith100PercentFidelity() {
        String seed = "ww-cipher-1";
        String original = "The quick brown fox jumps over the lazy dog 0123456789. Special punctuation: 'quotes', \"double\", —em dash... & more!";

        String obfuscated = service.obfuscateHtml(original, seed);
        String restored = service.deobfuscate(obfuscated, seed);

        assertEquals(original, restored, "Deobfuscating text with the same seed must produce exact original text");
    }

    @Test
    void allSeedsHaveUniquePermutations() {
        String sample = "abcdefghijklmnopqrstuvwxyz";
        String obf1 = service.obfuscateHtml(sample, "ww-cipher-1");
        String obf2 = service.obfuscateHtml(sample, "ww-cipher-2");
        String obf3 = service.obfuscateHtml(sample, "ww-cipher-3");

        assertNotEquals(obf1, obf2, "Different seeds must produce different scrambled text");
        assertNotEquals(obf2, obf3, "Different seeds must produce different scrambled text");
        assertNotEquals(obf1, obf3, "Different seeds must produce different scrambled text");
    }
}
