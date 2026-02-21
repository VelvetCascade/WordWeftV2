package com.wordweft.book.service;

import com.wordweft.book.model.Scene;
import com.wordweft.book.repository.SceneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SceneService {

    @Autowired
    private SceneRepository sceneRepository;

    public List<Scene> getScenesByBookId(String bookId) {
        return sceneRepository.findByBookId(bookId);
    }

    public List<Scene> getScenesByChapterId(String chapterId) {
        return sceneRepository.findByChapterId(chapterId);
    }

    public Scene createScene(Scene scene) {
        return sceneRepository.save(scene);
    }

    public Optional<Scene> getSceneById(String id) {
        return sceneRepository.findById(id);
    }

    public Scene updateScene(String id, Scene sceneDetails) {
        return sceneRepository.findById(id).map(scene -> {
            scene.setTitle(sceneDetails.getTitle());
            scene.setDescription(sceneDetails.getDescription());
            scene.setSetting(sceneDetails.getSetting());
            scene.setTime(sceneDetails.getTime());
            scene.setCharacterIds(sceneDetails.getCharacterIds());
            return sceneRepository.save(scene);
        }).orElse(null);
    }

    public void deleteScene(String id) {
        sceneRepository.deleteById(id);
    }
}
