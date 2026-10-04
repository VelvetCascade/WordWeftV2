package com.wordweft.book.controller;

import com.wordweft.book.model.Character;
import com.wordweft.book.service.CharacterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = "*")
public class CharacterController {

    @Autowired
    private CharacterService characterService;

    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<Map<String, Object>>> getCharactersByBookId(@PathVariable String bookId, @RequestParam(required = false) String chapterId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).varyBy("Authorization")
                .body(chapterId == null ? characterService.getCharactersByBookId(bookId) : characterService.getCharactersByBookId(bookId, chapterId));
    }

    @PostMapping
    public Character createCharacter(@Valid @RequestBody Character character) {
        return characterService.createCharacter(character);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCharacterById(@PathVariable String id) {
        return characterService.getCharacterById(id)
                .map(character -> ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                        .varyBy("Authorization").body(character))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Character> updateCharacter(@PathVariable String id, @Valid @RequestBody Character characterDetails) {
        Character updatedCharacter = characterService.updateCharacter(id, characterDetails);
        if (updatedCharacter != null) {
            return ResponseEntity.ok(updatedCharacter);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCharacter(@PathVariable String id) {
        characterService.deleteCharacter(id);
        return ResponseEntity.ok().build();
    }
}
