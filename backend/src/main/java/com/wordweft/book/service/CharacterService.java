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
            character.setImageUrl(characterDetails.getImageUrl());
            return characterRepository.save(character);
        }).orElse(null);
    }

    public void deleteCharacter(String id) {
        characterRepository.deleteById(id);
    }
}
