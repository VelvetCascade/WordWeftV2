package com.wordweft.book.controller;

import com.wordweft.book.model.Scene;
import com.wordweft.book.service.SceneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/scenes")
@CrossOrigin(origins = "*")
public class SceneController {

    @Autowired
    private SceneService sceneService;

    @GetMapping("/book/{bookId}")
    public List<Scene> getScenesByBookId(@PathVariable String bookId) {
        return sceneService.getScenesByBookId(bookId);
    }

    @PostMapping
    public Scene createScene(@Valid @RequestBody Scene scene) {
        return sceneService.createScene(scene);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Scene> getSceneById(@PathVariable String id) {
        return sceneService.getSceneById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Scene> updateScene(@PathVariable String id, @Valid @RequestBody Scene sceneDetails) {
        Scene updatedScene = sceneService.updateScene(id, sceneDetails);
        if (updatedScene != null) {
            return ResponseEntity.ok(updatedScene);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScene(@PathVariable String id) {
        sceneService.deleteScene(id);
        return ResponseEntity.ok().build();
    }
}
