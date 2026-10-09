package com.wordweft.book.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.Character;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CharacterRepository;
import com.wordweft.exception.ContentRestrictedException;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.support.ImageKitService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CharacterServiceAccessTest {
    private final CharacterRepository characters = mock(CharacterRepository.class);
    private final BookRepository books = mock(BookRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final ImageKitService images = mock(ImageKitService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private CharacterService service;
    private Book book;
    private Character character;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        book = new Book();
        book.setId("story");
        book.setAuthorId("owner");
        book.setPublicationStatus("published");
        book.setAgeRating(AgeRating.ALL_AGES);
        character = new Character();
        character.setId("cast-member");
        character.setBookId("story");
        character.setName("Elaria");
        character.setRole("Navigator");
        character.setDescription("A river navigator looking for her lost home.");
        character.setGoal("AUTHOR_PRIVATE_PLAN");
        character.setImageUrl("https://example.test/elaria.png");
        character.setImageFileId("PRIVATE_STORAGE_ID");
        when(books.findById("story")).thenReturn(Optional.of(book));
        when(characters.findByBookId("story")).thenReturn(List.of(character));
        when(characters.findById("cast-member")).thenReturn(Optional.of(character));
        when(characters.save(any(Character.class))).thenAnswer(invocation -> invocation.getArgument(0));

        try (var context = new AnnotationConfigApplicationContext()) {
            context.getBeanFactory().registerSingleton("characterRepository", characters);
            context.getBeanFactory().registerSingleton("bookRepository", books);
            context.getBeanFactory().registerSingleton("userRepository", users);
            context.getBeanFactory().registerSingleton("imageKitService", images);
            context.registerBean(ContentAccessService.class);
            context.registerBean(CharacterService.class);
            context.refresh();
            service = context.getBean(CharacterService.class);
        }
    }

    @AfterEach
    void cleanUp() { SecurityContextHolder.clearContext(); }

    @Test
    void publishedGuestGuideExcludesWriterPlansAndStorageIdentifiers() {
        assertPublicGuide(mapper.valueToTree(service.getCharactersByBookId("story").get(0)));
        assertPublicGuide(mapper.valueToTree(service.getCharacterById("cast-member").orElseThrow()));
        assertEquals("AUTHOR_PRIVATE_PLAN", character.getGoal());
        assertEquals("PRIVATE_STORAGE_ID", character.getImageFileId());
    }

    @Test
    void signedInReadersReceiveTheSamePublicGuideProjection() {
        signIn("reader", 1995, false);
        assertPublicGuide(mapper.valueToTree(service.getCharactersByBookId("story").get(0)));
    }

    @Test
    void ownerKeepsEveryEditingFieldForDraftsAndRestrictedStories() {
        signIn("owner", 1995, false);
        book.setPublicationStatus("draft");
        book.setAgeRating(AgeRating.ADULT_21);
        JsonNode result = mapper.valueToTree(service.getCharactersByBookId("story").get(0));
        assertEquals("AUTHOR_PRIVATE_PLAN", result.path("goal").asText());
        assertEquals("PRIVATE_STORAGE_ID", result.path("imageFileId").asText());
    }

    @Test
    void guestsCannotLookUpDraftCharactersThroughEitherEndpoint() {
        book.setPublicationStatus("draft");
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getCharactersByBookId("story"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getCharacterById("cast-member"));
        verify(characters, never()).findByBookId(any());
    }

    @Test
    void otherAccountsCannotReadAnAuthorsDraftCast() {
        signIn("reader", 1995, true);
        book.setPublicationStatus("draft");
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getCharactersByBookId("story"));
    }

    @Test
    void anonymousAndOptedOutAccountsCannotReadMatureCharacterGuides() {
        book.setAgeRating(AgeRating.MATURE_18);
        assertThrows(ContentRestrictedException.class, () -> service.getCharactersByBookId("story"));
        signIn("reader", 1995, false);
        assertThrows(ContentRestrictedException.class, () -> service.getCharacterById("cast-member"));
    }

    @Test
    void eligibleOptedInAdultsCanReadMaturePublicGuides() {
        signIn("reader", 1995, true);
        book.setAgeRating(AgeRating.MATURE_18);
        assertPublicGuide(mapper.valueToTree(service.getCharactersByBookId("story").get(0)));
    }

    @Test
    void underThirteenAccountsCannotBypassTheTeenStoryPolicy() {
        signIn("reader", LocalDate.now().getYear() - 10, true);
        book.setAgeRating(AgeRating.TEEN_13);
        assertThrows(ContentRestrictedException.class, () -> service.getCharactersByBookId("story"));
    }

    @Test
    void chapterContentWarningsAlsoRestrictTheCharacterGuide() {
        Chapter chapter = new Chapter();
        chapter.setContentWarnings(List.of("GORE"));
        book.setChapters(List.of(chapter));
        assertThrows(ContentRestrictedException.class, () -> service.getCharactersByBookId("story"));
    }

    @Test
    void missingStoryCannotExposeOrphanedCharacters() {
        when(books.findById("story")).thenReturn(Optional.empty());
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getCharactersByBookId("story"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getCharacterById("cast-member"));
    }

    @Test
    void createRejectsNonOwnersBeforeSaving() {
        signIn("reader", 1995, true);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.createCharacter(character));
        verify(characters, never()).save(any());
    }

    @Test
    void updatesRejectNonOwnersBeforeChangingFieldsOrDeletingImages() {
        signIn("reader", 1995, true);
        Character changes = new Character(); changes.setName("Replacement"); changes.setImageUrl("");
        assertStatus(HttpStatus.FORBIDDEN, () -> service.updateCharacter("cast-member", changes));
        assertEquals("Elaria", character.getName());
        verify(characters, never()).save(any());
        verifyNoInteractions(images);
    }

    @Test
    void deletesRejectNonOwnersBeforeDeletingCharactersOrImages() {
        signIn("reader", 1995, true);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.deleteCharacter("cast-member"));
        verify(characters, never()).deleteById(any());
        verifyNoInteractions(images);
    }

    @Test
    void callersCannotCreateWithAnIdThatOverwritesAnotherCharacter() {
        signIn("owner", 1995, false);
        service.createCharacter(character);
        verify(characters).save(argThat(saved -> saved.getId() == null));
    }

    @Test
    void missingBookIdIsAnInvalidCreationRequest() {
        signIn("owner", 1995, false);
        character.setBookId(null);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createCharacter(character));
        verify(characters, never()).save(any());
    }

    @Test
    void mutationServicesRequireAnActualAccountEvenWhenInvokedDirectly() {
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.createCharacter(character));
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.updateCharacter("cast-member", character));
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.deleteCharacter("cast-member"));
        verify(characters, never()).save(any());
        verifyNoInteractions(images);
    }

    @Test
    void ownerUpdatesRetainTheStoredStoryAndFullPlanningFields() {
        signIn("owner", 1995, false);
        Character changes = new Character();
        changes.setBookId("some-other-story");
        changes.setName("Revised Elaria");
        changes.setRole("Captain");
        changes.setDescription("Updated reader biography");
        changes.setGoal("Updated private plan");
        changes.setImageUrl(character.getImageUrl());
        changes.setImageFileId(character.getImageFileId());
        Character saved = service.updateCharacter("cast-member", changes);
        assertEquals("story", saved.getBookId());
        assertEquals("Revised Elaria", saved.getName());
        assertEquals("Updated private plan", saved.getGoal());
        assertEquals("PRIVATE_STORAGE_ID", saved.getImageFileId());
        verifyNoInteractions(images);
    }

    @Test
    void ownerDeletesStillCleanUpTheOwnedPortrait() {
        signIn("owner", 1995, false);
        service.deleteCharacter("cast-member");
        verify(images).deleteFile("PRIVATE_STORAGE_ID");
        verify(characters).deleteById("cast-member");
    }

    @Test
    void unknownCharacterLookupKeepsItsNotFoundResult() {
        assertTrue(service.getCharacterById("unknown").isEmpty());
    }

    @Test
    void explicitPrivacyAndPublicGoalsAreAppliedServerSide() {
        character.setDescriptionVisibility("PRIVATE"); character.setGoalVisibility("PUBLIC");
        var view = service.getCharactersByBookId("story").get(0);
        assertFalse(view.containsKey("description")); assertEquals("AUTHOR_PRIVATE_PLAN", view.get("goal"));
        assertEquals("PUBLIC", view.get("goalVisibility"));
    }

    @Test
    void chapterRevealNeverExposesSpoilersBeforeTheReleasedContextOrToGuests() {
        Chapter first = new Chapter(); first.setId("first"); first.setStatus("published");
        Chapter second = new Chapter(); second.setId("second"); second.setStatus("published");
        Chapter draft = new Chapter(); draft.setId("draft"); draft.setStatus("draft");
        book.setChapters(List.of(first,second,draft));
        character.setSpoilerDetails("SPOILER_SECRET"); character.setSpoilerChapterId("second");
        assertFalse(service.getCharactersByBookId("story","second").get(0).containsKey("spoilerDetails"));
        signIn("reader",1995,false);
        assertFalse(service.getCharactersByBookId("story","first").get(0).containsKey("spoilerDetails"));
        assertEquals("SPOILER_SECRET", service.getCharactersByBookId("story","second").get(0).get("spoilerDetails"));
        character.setSpoilerChapterId("draft");
        assertFalse(service.getCharactersByBookId("story","draft").get(0).containsKey("spoilerDetails"));
    }

    @Test
    void legacyUpdatesDoNotResetExplicitVisibility() {
        signIn("owner",1995,false); character.setDescriptionVisibility("PRIVATE"); character.setGoalVisibility("PUBLIC");
        Character update = new Character(); update.setName("Elaria"); update.setImageUrl(character.getImageUrl());
        var saved = service.updateCharacter("cast-member", update);
        assertEquals("PRIVATE", saved.getDescriptionVisibility()); assertEquals("PUBLIC",saved.getGoalVisibility());
    }

    @Test
    void authorAliasesPersistAndFutureDraftRevealNeverLeaksToReaders() {
        Chapter released = new Chapter(); released.setId("released"); released.setStatus("published");
        Chapter draft = new Chapter(); draft.setId("future"); book.setChapters(List.of(released, draft));
        signIn("owner", 1995, false);
        Character changes = new Character(); changes.setName("Elaria"); changes.setImageUrl(character.getImageUrl());
        changes.setAliases(List.of(" Lia ", "River Captain")); changes.setSpoilerChapterId("future"); changes.setSpoilerDetails("FUTURE_SECRET");
        Character saved = service.updateCharacter("cast-member", changes);
        assertEquals(List.of("Lia", "River Captain"), saved.getAliases()); assertEquals("future", saved.getSpoilerChapterId());
        assertEquals(List.of("Lia", "River Captain"), service.getCharactersByBookId("story").get(0).get("aliases"));
        signIn("reader", 1995, false);
        var view = service.getCharactersByBookId("story", "future").get(0);
        assertFalse(view.containsKey("aliases")); assertFalse(view.containsKey("spoilerDetails"));
        draft.setStatus("published");
        assertEquals("FUTURE_SECRET", service.getCharactersByBookId("story", "future").get(0).get("spoilerDetails"));
    }

    private void signIn(String id, int birthYear, boolean matureOptIn) {
        User user = new User(); user.setId(id); user.setDateOfBirth(LocalDate.of(birthYear, 1, 1));
        user.setAllowMatureContent(matureOptIn);
        when(users.findAccessPreferencesById(id)).thenReturn(Optional.of(user));
        UserDetailsImpl principal = new UserDetailsImpl(id, id, id + "@example.test", "hash", List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private static void assertPublicGuide(JsonNode result) {
        assertEquals("cast-member", result.path("id").asText());
        assertEquals("story", result.path("bookId").asText());
        assertEquals("Elaria", result.path("name").asText());
        assertEquals("Navigator", result.path("role").asText());
        assertEquals("A river navigator looking for her lost home.", result.path("description").asText());
        assertEquals("https://example.test/elaria.png", result.path("imageUrl").asText());
        assertFalse(result.has("goal"));
        assertFalse(result.has("imageFileId"));
    }

    private static void assertStatus(HttpStatus status, org.junit.jupiter.api.function.Executable action) {
        assertEquals(status, assertThrows(ResponseStatusException.class, action).getStatusCode());
    }
}
