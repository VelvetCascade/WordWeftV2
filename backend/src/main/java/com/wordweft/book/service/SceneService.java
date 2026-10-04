package com.wordweft.book.service;

import com.wordweft.book.model.Scene;
import com.wordweft.book.model.Book;
import com.wordweft.book.repository.SceneRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SceneService {
    private final SceneRepository scenes;
    private final PlanningAccessService access;
    public SceneService(SceneRepository scenes, PlanningAccessService access) { this.scenes = scenes; this.access = access; }
    public List<Scene> getScenesByBookId(String bookId) {
        access.requireOwner(bookId);
        return scenes.findByBookId(bookId);
    }
    public List<Scene> getScenesByChapterId(String chapterId) {
        access.requireChapterOwner(chapterId);
        return scenes.findByChapterId(chapterId);
    }
    public Scene createScene(Scene scene) {
        Book book = access.requireOwner(scene.getBookId());
        access.validateChapter(book, scene.getChapterId());
        access.validateCharacters(book, scene.getCharacterIds());
        scene.setId(null); // Creation cannot upsert an existing record supplied by a caller.
        if (scene.getChapterId() != null && scene.getChapterId().isBlank()) scene.setChapterId(null);
        return scenes.save(scene);
    }
    public Optional<Scene> getSceneById(String id) {
        access.requireAccount();
        return scenes.findById(id).map(scene -> { access.requireOwner(scene.getBookId()); return scene; });
    }
    public Scene updateScene(String id, Scene details) {
        access.requireAccount();
        return scenes.findById(id).map(scene -> {
            Book book = access.requireOwner(scene.getBookId());
            access.validateChapter(book, details.getChapterId());
            access.validateCharacters(book, details.getCharacterIds());
            scene.setTitle(details.getTitle());
            scene.setDescription(details.getDescription());
            scene.setSetting(details.getSetting());
            scene.setTime(details.getTime());
            scene.setChapterId(details.getChapterId() == null || details.getChapterId().isBlank() ? null : details.getChapterId());
            scene.setCharacterIds(details.getCharacterIds());
            return scenes.save(scene);
        }).orElse(null);
    }
    public void deleteScene(String id) {
        access.requireAccount();
        scenes.findById(id).ifPresent(scene -> { access.requireOwner(scene.getBookId()); scenes.deleteById(id); });
    }
}
