
package com.wordweft.search.controller;

import com.wordweft.search.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Autowired
    private SearchService searchService;

    /**
     * Autocomplete endpoint — returns top 5 books + 3 authors with minimal fields.
     * GET /api/search/autocomplete?q=harry
     */
    @GetMapping("/autocomplete")
    public ResponseEntity<?> autocomplete(@RequestParam("q") String query) {
        if (query == null || query.trim().length() < 2) {
            return ResponseEntity.ok(java.util.Map.of("books", java.util.List.of(), "authors", java.util.List.of()));
        }
        return ResponseEntity.ok(searchService.autocomplete(query.trim()));
    }

    /**
     * Full search endpoint — paginated results.
     * GET /api/search?q=fantasy&type=all&page=0&size=12
     */
    @GetMapping
    public ResponseEntity<?> search(
            @RequestParam("q") String query,
            @RequestParam(value = "type", defaultValue = "all") String type,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "12") int size) {

        if (query == null || query.trim().length() < 2) {
            return ResponseEntity
                    .ok(java.util.Map.of("books", java.util.Map.of("items", java.util.List.of(), "total", 0),
                            "authors", java.util.Map.of("items", java.util.List.of(), "total", 0)));
        }
        return ResponseEntity.ok(searchService.fullSearch(query.trim(), type, page, size));
    }
}
