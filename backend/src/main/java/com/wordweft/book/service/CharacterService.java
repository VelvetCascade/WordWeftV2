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
        return getCharactersByBookId(bookId, null);
    }

    public List<Map<String, Object>> getCharactersByBookId(String bookId, String chapterId) {
        Book book = visibleBook(bookId);
        boolean owner = isOwner(book);
        return characterRepository.findByBookId(bookId).stream()
                .map(character -> characterView(character, owner, book, chapterId)).toList();
    }

    public Character createCharacter(Character character) {
        requireOwner(character.getBookId(), requireAccount());
        // Creation must not become an upsert of an arbitrary existing character.
        character.setId(null);
        character.setAliases(normalizeAliases(character.getAliases()));
        if (character.getDescriptionVisibility() == null) character.setDescriptionVisibility("PUBLIC");
        if (character.getGoalVisibility() == null) character.setGoalVisibility("PRIVATE");
        return characterRepository.save(character);
    }

    public Optional<Map<String, Object>> getCharacterById(String id) {
        return characterRepository.findById(id).map(character -> {
            Book book = visibleBook(character.getBookId());
            return characterView(character, isOwner(book), book, null);
        });
    }

    public Character updateCharacter(String id, Character characterDetails) {
        String userId = requireAccount();
        return characterRepository.findById(id).map(character -> {
            requireOwner(character.getBookId(), userId);
            character.setName(characterDetails.getName());
            if (characterDetails.getAliases() != null) character.setAliases(normalizeAliases(characterDetails.getAliases()));
            character.setRole(characterDetails.getRole());
            character.setDescription(characterDetails.getDescription());
            character.setGoal(characterDetails.getGoal());
            if (characterDetails.getDescriptionVisibility() != null) character.setDescriptionVisibility(characterDetails.getDescriptionVisibility());
            if (characterDetails.getGoalVisibility() != null) character.setGoalVisibility(characterDetails.getGoalVisibility());
            character.setSpoilerDetails(characterDetails.getSpoilerDetails());
            character.setSpoilerChapterId(characterDetails.getSpoilerChapterId());

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

    private List<String> normalizeAliases(List<String> aliases) {
        if (aliases == null) return List.of();
        if (aliases.size() > 20 || aliases.stream().anyMatch(a -> a == null || a.isBlank() || a.length() > 100)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use at most 20 aliases of 100 characters or fewer.");
        }
        return aliases.stream().map(String::trim).distinct().toList();
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

    private boolean spoilerPermitted(Book book, String chapterId, String revealId) {
        if (revealId == null || revealId.isBlank()) return true; // Manually revealed spoiler section.
        if (chapterId == null || book.getChapters() == null) return false;
        List<String> released = book.getChapters().stream().filter(c -> "published".equals(c.getStatus())).map(com.wordweft.book.model.Chapter::getId).toList();
        int current = released.indexOf(chapterId), reveal = released.indexOf(revealId);
        // Guests only have the first chapter preview. A later context must not bypass the sign-in gate.
        return reveal >= 0 && current >= reveal && contentAccessService.currentUserId() != null;
    }

    private Map<String, Object> characterView(Character character, boolean owner, Book book, String chapterId) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", character.getId());
        view.put("bookId", character.getBookId());
        view.put("name", character.getName());
        view.put("role", character.getRole());
        if (owner || !"PRIVATE".equals(character.getDescriptionVisibility())) view.put("description", character.getDescription());
        if (owner || "PUBLIC".equals(character.getGoalVisibility())) { view.put("goal", character.getGoal()); view.put("goalVisibility", character.getGoalVisibility()); }
        boolean hasSpoiler = character.getSpoilerDetails() != null && !character.getSpoilerDetails().isBlank();
        view.put("spoilerAvailable", hasSpoiler);
        if (owner || spoilerPermitted(book, chapterId, character.getSpoilerChapterId())) view.put("spoilerDetails", character.getSpoilerDetails());
        view.put("imageUrl", character.getImageUrl());
        if (owner) {
            view.put("aliases", character.getAliases() == null ? List.of() : character.getAliases());
            view.put("descriptionVisibility", character.getDescriptionVisibility() == null ? "PUBLIC" : character.getDescriptionVisibility());
            view.put("goalVisibility", character.getGoalVisibility() == null ? "PRIVATE" : character.getGoalVisibility());
            view.put("spoilerChapterId", character.getSpoilerChapterId());
            view.put("imageFileId", character.getImageFileId());
        }
        return view;
    }
}
