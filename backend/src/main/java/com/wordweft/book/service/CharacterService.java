package com.wordweft.book.service;

import com.wordweft.book.model.Character;
import com.wordweft.book.repository.CharacterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CharacterService {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private com.wordweft.support.ImageKitService imageKitService;

    public List<Character> getCharactersByBookId(String bookId) {
        return characterRepository.findByBookId(bookId);
    }

    public Character createCharacter(Character character) {
        return characterRepository.save(character);
    }

    public Optional<Character> getCharacterById(String id) {
        return characterRepository.findById(id);
    }

    public Character updateCharacter(String id, Character characterDetails) {
        return characterRepository.findById(id).map(character -> {
            character.setName(characterDetails.getName());
            character.setRole(characterDetails.getRole());
            character.setDescription(characterDetails.getDescription());
            character.setGoal(characterDetails.getGoal());

            if (characterDetails.getImageUrl() != null && !characterDetails.getImageUrl().isEmpty()) {
                if (!characterDetails.getImageUrl().equals(character.getImageUrl()) && character.getImageFileId() != null) {
                    imageKitService.deleteFile(character.getImageFileId());
                }
                character.setImageUrl(characterDetails.getImageUrl());
                character.setImageFileId(characterDetails.getImageFileId());
            } else if (characterDetails.getImageUrl() == null || characterDetails.getImageUrl().isEmpty()) {
                if (character.getImageFileId() != null) {
                    imageKitService.deleteFile(character.getImageFileId());
                }
                character.setImageUrl("");
                character.setImageFileId(null);
            }

            return characterRepository.save(character);
        }).orElse(null);
    }

    public void deleteCharacter(String id) {
        characterRepository.findById(id).ifPresent(character -> {
            if (character.getImageFileId() != null) {
                imageKitService.deleteFile(character.getImageFileId());
            }
            characterRepository.deleteById(id);
        });
    }
}
