package com.wordweft.seo;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** This API has no side effects and returns the same anonymous projection for every caller. */
@RestController
@RequestMapping("/api/public/seo")
public class PublicSeoController {
    private final PublicSeoService service;
    public PublicSeoController(PublicSeoService service) { this.service = service; }

    @GetMapping("/book/{id}") public ResponseEntity<?> book(@PathVariable String id, @RequestParam(required = false) String chapterId) { return response(service.book(id, chapterId)); }
    @GetMapping("/author/{id}") public ResponseEntity<?> author(@PathVariable String id, @RequestParam(defaultValue = "1") int page) { return response(service.author(id, page)); }
    @GetMapping("/catalog") public ResponseEntity<?> catalog(@RequestParam(required = false) String genre, @RequestParam(required = false) String tag, @RequestParam(defaultValue = "1") int page) { return response(service.catalog(genre, tag, null, page)); }
    @GetMapping("/sitemap") public ResponseEntity<?> sitemap() { return response(service.sitemapCounts()); }
    @GetMapping("/sitemap/{kind}") public ResponseEntity<?> sitemap(@PathVariable String kind, @RequestParam(defaultValue = "1") int page) { return response(service.sitemap(kind, page)); }

    private ResponseEntity<?> response(Object body) {
        // Live visibility checks are deliberate: an unpublish must not leave manuscript HTML in a shared cache.
        return body == null ? ResponseEntity.notFound().header("X-Robots-Tag", "noindex").build()
                : ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Robots-Tag", "noindex").body(body);
    }
    @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<?> invalid() { return ResponseEntity.badRequest().header("X-Robots-Tag", "noindex").build(); }
}
