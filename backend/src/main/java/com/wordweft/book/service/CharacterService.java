package com.wordweft.book.service;

import com.wordweft.book.model.Character;
import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CharacterRepository;
import com.wordweft.exception.ContentRestrictedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class CharacterService {

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private ContentAccessService contentAccessService;

    @Autowired
    private com.wordweft.support.ImageKitService imageKitService;

    public List<Map<String, Object>> getCharactersByBookId(String bookId) {
        Book book = visibleBook(bookId);
        boolean owner = isOwner(book);
        return characterRepository.findByBookId(bookId).stream()
                .map(character -> characterView(character, owner)).toList();
    }

    public Character createCharacter(Character character) {
        requireOwner(character.getBookId(), requireAccount());
        // Creation must not become an upsert of an arbitrary existing character.
        character.setId(null);
        return characterRepository.save(character);
    }

    public Optional<Map<String, Object>> getCharacterById(String id) {
        return characterRepository.findById(id).map(character -> {
            Book book = visibleBook(character.getBookId());
            return characterView(character, isOwner(book));
        });
    }

    public Character updateCharacter(String id, Character characterDetails) {
        String userId = requireAccount();
        return characterRepository.findById(id).map(character -> {
            requireOwner(character.getBookId(), userId);
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
        String userId = requireAccount();
        characterRepository.findById(id).ifPresent(character -> {
            requireOwner(character.getBookId(), userId);
            if (character.getImageFileId() != null) {
                imageKitService.deleteFile(character.getImageFileId());
            }
            characterRepository.deleteById(id);
        });
    }

    private Book visibleBook(String bookId) {
        Book book = findBook(bookId);
        if (!isOwner(book) && !"published".equals(book.getPublicationStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found.");
        }
        if (!contentAccessService.canAccess(book)) {
            int minimumAge = contentAccessService.effectiveRating(book).getMinimumAge();
            throw new ContentRestrictedException("This story is rated " + minimumAge
                    + "+. Sign in and enable mature content in your profile if you are eligible.");
        }
        return book;
    }

    private Book findBook(String bookId) {
        if (bookId == null || bookId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found.");
        }
        return bookRepository.findById(bookId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found."));
    }

    private boolean isOwner(Book book) {
        String userId = contentAccessService.currentUserId();
        return userId != null && userId.equals(book.getAuthorId());
    }

    private String requireAccount() {
        String userId = contentAccessService.currentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to edit story characters.");
        }
        return userId;
    }

    private void requireOwner(String bookId, String userId) {
        if (bookId == null || bookId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A story is required for a character.");
        }
        if (!userId.equals(findBook(bookId).getAuthorId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the story's author can edit its characters.");
        }
    }

    private Map<String, Object> characterView(Character character, boolean owner) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", character.getId());
        view.put("bookId", character.getBookId());
        view.put("name", character.getName());
        view.put("role", character.getRole());
        view.put("description", character.getDescription());
        view.put("imageUrl", character.getImageUrl());
        if (owner) {
            view.put("goal", character.getGoal());
            view.put("imageFileId", character.getImageFileId());
        }
        return view;
    }
}
