package com.wordweft.manuscript.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

/** Visible manuscript text: markup attributes never count and inline formatting joins words. */
public final class ManuscriptText {
    private ManuscriptText() {}
    public static String plainText(String html) {
        if (html == null || html.isBlank()) return "";
        StringBuilder result = new StringBuilder();
        append(Jsoup.parseBodyFragment(html).body(), result);
        return result.toString().replaceAll("[\\s\\p{Z}]+", " ").trim();
    }
    public static int wordCount(String html) {
        String text = plainText(html);
        return text.isEmpty() ? 0 : text.split(" ").length;
    }
    private static void append(Node node, StringBuilder result) {
        if (node instanceof TextNode text) { result.append(text.getWholeText()); return; }
        if (node instanceof Element element) {
            if (java.util.Set.of("script", "style", "template", "noscript").contains(element.normalName())) return;
            boolean boundary = element.isBlock() || java.util.Set.of("br", "hr").contains(element.normalName());
            if (boundary) result.append(' ');
            for (Node child : element.childNodes()) append(child, result);
            if (boundary) result.append(' ');
        }
    }
}
