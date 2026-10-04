package com.wordweft.book.controller;

import com.wordweft.book.service.PassageBookmarkService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/reading/passages")
public class PassageBookmarkController {
    private final PassageBookmarkService passages;
    public PassageBookmarkController(PassageBookmarkService passages) { this.passages = passages; }
    @GetMapping("/{bookId}")
    public ResponseEntity<?> list(@PathVariable String bookId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).varyBy("Authorization").body(passages.list(bookId));
    }
    @PutMapping("/{bookId}/{chapterId}/{paragraphIndex}")
    public ResponseEntity<?> save(@PathVariable String bookId, @PathVariable String chapterId, @PathVariable int paragraphIndex, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(passages.save(bookId, chapterId, paragraphIndex, body.get("note")));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) { passages.delete(id); return ResponseEntity.noContent().build(); }
}
