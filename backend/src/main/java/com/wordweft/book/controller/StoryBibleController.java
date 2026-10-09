package com.wordweft.book.controller;
import com.wordweft.book.model.StoryBibleEntry;
import com.wordweft.book.service.StoryBibleService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/story-bible")
public class StoryBibleController {
    private final StoryBibleService service;
    public StoryBibleController(StoryBibleService service) { this.service = service; }
    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<StoryBibleEntry>> read(@PathVariable String bookId, @RequestParam(required=false) String chapterId, @RequestParam(required=false) String characterId, @RequestParam(defaultValue="false") boolean readerView) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).varyBy("Authorization").body(service.read(bookId, chapterId, characterId, readerView));
    }
    @PostMapping public StoryBibleEntry create(@Valid @RequestBody StoryBibleEntry entry) { return service.create(entry); }
    @PutMapping("/{id}") public StoryBibleEntry update(@PathVariable String id, @Valid @RequestBody StoryBibleEntry entry) { return service.update(id, entry); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable String id) { service.delete(id); return ResponseEntity.noContent().build(); }
}
