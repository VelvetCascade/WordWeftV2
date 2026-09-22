package com.wordweft.support;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;

/**
 * Crawler-visible share pages. Social preview bots do not execute the SPA and
 * never receive URL hash fragments, so these tiny documents provide entity
 * metadata before forwarding human visitors to the real WordWeft page.
 */
@RestController
@RequestMapping("/api/public/share")
public class SharePreviewController {
    private static final String SITE_ORIGIN = "https://www.wordweftstudio.com";
    private static final String DEFAULT_IMAGE = SITE_ORIGIN + "/og-banner.jpg";

    private final BookRepository books;
    private final UserRepository users;

    public SharePreviewController(BookRepository books, UserRepository users) {
        this.books = books;
        this.users = users;
    }

    @GetMapping(value = "/book/{bookId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> book(@PathVariable String bookId) {
        Book book = books.findById(bookId)
                .filter(com.wordweft.seo.PublicSeoService::isPublic)
                .orElse(null);
        if (book == null) return ResponseEntity.notFound().build();

        User author = users.findById(book.getAuthorId()).orElse(null);
        String authorName = author == null ? "a WordWeft author" : author.getUsername();
        String title = book.getTitle() + " by " + authorName;
        String description = firstUseful(book.getSummary(), book.getDescription(), "Read this story on WordWeft.");
        String canonical = SITE_ORIGIN + "/book/" + segment(book.getId());
        return preview(title, description, safeImage(book.getCoverUrl()), canonical, "book");
    }

    @GetMapping(value = "/author/{authorId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> author(@PathVariable String authorId) {
        User author = users.findById(authorId).orElse(null);
        if (author == null) return ResponseEntity.notFound().build();

        var published = books.findByAuthorIdAndPublicationStatus(authorId, "published").stream()
                .filter(com.wordweft.seo.PublicSeoService::isPublic).toList();
        String title = author.getUsername() + " — Author Portfolio on WordWeft";
        String description = firstUseful(author.getBio(),
                published.isEmpty() ? null : "Explore " + published.size() + " published " + (published.size() == 1 ? "story" : "stories") + ".",
                "Discover this author's work on WordWeft.");
        String image = published.stream()
                .sorted(Comparator.comparing(Book::getPublishedDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(Book::getCoverUrl).filter(value -> value != null && !value.isBlank()).findFirst()
                .orElse(author.getAvatarUrl());
        String canonical = SITE_ORIGIN + "/author/" + segment(author.getId());
        return preview(title, description, safeImage(image), canonical, "profile");
    }

    private ResponseEntity<String> preview(String title, String description, String image, String canonical, String type) {
        String safeTitle = html(title);
        String safeDescription = html(description);
        String safeImage = html(image);
        String safeCanonical = html(canonical);
        String imageDimensions = DEFAULT_IMAGE.equals(image)
                ? "<meta property=\"og:image:width\" content=\"1200\"><meta property=\"og:image:height\" content=\"630\">"
                : "";
        String body = """
                <!doctype html><html lang="en"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>%s</title><meta name="description" content="%s">
                <link rel="canonical" href="%s"><meta property="og:site_name" content="WordWeft">
                <meta property="og:type" content="%s"><meta property="og:title" content="%s">
                <meta property="og:description" content="%s"><meta property="og:url" content="%s">
                <meta property="og:image" content="%s">%s<meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="%s"><meta name="twitter:description" content="%s">
                <meta name="twitter:image" content="%s"></head><body>
                <p>Opening <a href="%s">%s on WordWeft</a>…</p>
                <script>location.replace(document.querySelector('link[rel=canonical]').href)</script>
                </body></html>
                """.formatted(safeTitle, safeDescription, safeCanonical, html(type), safeTitle,
                safeDescription, safeCanonical, safeImage, imageDimensions, safeTitle, safeDescription, safeImage,
                safeCanonical, safeTitle);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .cacheControl(CacheControl.noStore())
                .header("X-Robots-Tag", "noindex, follow")
                .body(body);
    }

    private String firstUseful(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                String plain = value.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
                return plain.length() > 240 ? plain.substring(0, 237) + "…" : plain;
            }
        }
        return "Discover stories on WordWeft.";
    }

    private String safeImage(String value) {
        return value != null && value.matches("^https://[^\\s]+$") ? value : DEFAULT_IMAGE;
    }

    private String html(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    private String segment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
