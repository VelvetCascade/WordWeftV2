package com.wordweft.book.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.parser.Tag;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChapterPreviewService {

    private static final Pattern WORD = Pattern.compile("\\S+");
    private static final Set<String> ATOMIC_BLOCKS = Set.of(
            "table", "pre", "figure", "video", "audio", "svg", "math", "canvas"
    );

    public record Preview(String html, int previewWordCount, int fullWordCount) {
    }

    public Preview preview(String html) {
        Document source = Jsoup.parseBodyFragment(Objects.requireNonNullElse(html, ""));
        source.select("script,style,iframe,object,embed,noscript").remove();

        int fullWordCount = wordCount(source.body().text());
        if (fullWordCount == 0) {
            return new Preview("", 0, 0);
        }

        int target = fullWordCount < 1_000
                ? Math.max(1, (int) Math.floor(fullWordCount * .60))
                : Math.min(1_200, Math.max(600, fullWordCount / 2));
        WordBudget budget = new WordBudget(Math.min(target, fullWordCount - 1));
        Element output = new Element(Tag.valueOf("div"), "");

        copyChildrenWithinBudget(source.body(), output, budget);

        String previewHtml = output.html();
        return new Preview(previewHtml, wordCount(output.text()), fullWordCount);
    }

    private boolean copyChildrenWithinBudget(Element source, Element destination, WordBudget budget) {
        for (Node child : source.childNodes()) {
            if (budget.remaining == 0 || copyNodeWithinBudget(child, destination, budget)) {
                return true;
            }
        }
        return false;
    }

    private boolean copyNodeWithinBudget(Node source, Element destination, WordBudget budget) {
        if (source instanceof TextNode textNode) {
            return copyTextWithinBudget(textNode, destination, budget);
        }
        if (!(source instanceof Element element)) {
            return false;
        }

        int elementWords = wordCount(element.text());
        if (ATOMIC_BLOCKS.contains(element.normalName()) && elementWords > budget.remaining) {
            return true;
        }
        if (elementWords <= budget.remaining) {
            destination.appendChild(element.clone());
            budget.remaining -= elementWords;
            return budget.remaining == 0;
        }

        Element partial = element.clone();
        partial.empty();
        destination.appendChild(partial);
        return copyChildrenWithinBudget(element, partial, budget);
    }

    private boolean copyTextWithinBudget(TextNode source, Element destination, WordBudget budget) {
        String text = source.getWholeText();
        int textWords = wordCount(text);
        if (textWords <= budget.remaining) {
            destination.appendChild(new TextNode(text));
            budget.remaining -= textWords;
            return budget.remaining == 0;
        }

        Matcher matcher = WORD.matcher(text);
        int wordsTaken = 0;
        int end = 0;
        while (wordsTaken < budget.remaining && matcher.find()) {
            end = matcher.end();
            wordsTaken++;
        }
        if (end > 0) {
            destination.appendChild(new TextNode(text.substring(0, end).stripTrailing() + "…"));
        }
        budget.remaining = 0;
        return true;
    }

    private int wordCount(String value) {
        Matcher matcher = WORD.matcher(Objects.requireNonNullElse(value, "").strip());
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private static final class WordBudget {
        private int remaining;

        private WordBudget(int remaining) {
            this.remaining = Math.max(0, remaining);
        }
    }
}
