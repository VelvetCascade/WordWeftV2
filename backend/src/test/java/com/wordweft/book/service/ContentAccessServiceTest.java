package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContentAccessServiceTest {

    private UserRepository userRepository;
    private ContentAccessService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        service = new ContentAccessService();
        ReflectionTestUtils.setField(service, "userRepository", userRepository);
    }

    @Test
    void requiredRatingForWarningsMapsSeveritiesCorrectly() {
        assertEquals(AgeRating.ALL_AGES, ContentAccessService.requiredRatingForWarnings(List.of()));
        assertEquals(AgeRating.ALL_AGES, ContentAccessService.requiredRatingForWarnings(List.of("GRIEF", "OTHER")));

        assertEquals(AgeRating.TEEN_13, ContentAccessService.requiredRatingForWarnings(List.of("VIOLENCE")));
        assertEquals(AgeRating.TEEN_13, ContentAccessService.requiredRatingForWarnings(List.of("STRONG_LANGUAGE", "SUBSTANCE_USE")));

        assertEquals(AgeRating.MATURE_18, ContentAccessService.requiredRatingForWarnings(List.of("GORE")));
        assertEquals(AgeRating.MATURE_18, ContentAccessService.requiredRatingForWarnings(List.of("SEXUAL_CONTENT")));
        assertEquals(AgeRating.MATURE_18, ContentAccessService.requiredRatingForWarnings(List.of("ABUSE")));
        assertEquals(AgeRating.MATURE_18, ContentAccessService.requiredRatingForWarnings(List.of("SELF_HARM")));

        // Mixed warnings should pick the highest
        assertEquals(AgeRating.MATURE_18, ContentAccessService.requiredRatingForWarnings(List.of("VIOLENCE", "SEXUAL_CONTENT", "GRIEF")));
    }

    @Test
    void effectiveRatingElevatesBookWhenChapterHasMatureWarnings() {
        Book book = new Book();
        book.setAgeRating(AgeRating.ALL_AGES);
        book.setMature(false);

        assertEquals(AgeRating.ALL_AGES, service.effectiveRating(book));

        Chapter ch1 = new Chapter();
        ch1.setContentWarnings(List.of("VIOLENCE"));
        book.getChapters().add(ch1);

        // Elevated to TEEN_13 due to chapter
        assertEquals(AgeRating.TEEN_13, service.effectiveRating(book));

        Chapter ch2 = new Chapter();
        ch2.setContentWarnings(List.of("GORE", "SEXUAL_CONTENT"));
        book.getChapters().add(ch2);

        // Elevated to MATURE_18 due to chapter mature warnings
        assertEquals(AgeRating.MATURE_18, service.effectiveRating(book));
    }

    @Test
    void effectiveRatingPreservesExplicitAdult21() {
        Book book = new Book();
        book.setAgeRating(AgeRating.ADULT_21);
        book.setMature(true);

        assertEquals(AgeRating.ADULT_21, service.effectiveRating(book));
    }

    @Test
    void under18UsersCannotDiscoverMatureBooks() {
        // User is 14 years old
        User teenUser = new User();
        teenUser.setId("teen-1");
        teenUser.setDateOfBirth(LocalDate.now().minusYears(14));
        teenUser.setAllowMatureContent(true); // even if true, age gate applies!

        when(userRepository.findById("teen-1")).thenReturn(Optional.of(teenUser));

        ContentAccessService spyService = spy(service);
        doReturn("teen-1").when(spyService).currentUserId();

        Book matureBook = new Book();
        matureBook.setAgeRating(AgeRating.TEEN_13);
        Chapter matureChapter = new Chapter();
        matureChapter.setContentWarnings(List.of("SEXUAL_CONTENT"));
        matureBook.getChapters().add(matureChapter);

        // Effective rating is MATURE_18 because of chapter
        assertEquals(AgeRating.MATURE_18, spyService.effectiveRating(matureBook));
        // Teen cannot discover this book
        assertFalse(spyService.canDiscover(matureBook));
        // Teen is not author, so cannot access
        assertFalse(spyService.canAccess(matureBook));
    }

    @Test
    void authorsCanAlwaysAccessTheirOwnStories() {
        User author = new User();
        author.setId("author-1");
        author.setDateOfBirth(LocalDate.now().minusYears(15)); // 15 years old

        when(userRepository.findById("author-1")).thenReturn(Optional.of(author));

        ContentAccessService spyService = spy(service);
        doReturn("author-1").when(spyService).currentUserId();

        Book matureBook = new Book();
        matureBook.setAuthorId("author-1");
        matureBook.setAgeRating(AgeRating.MATURE_18);
        matureBook.setMature(true);

        // Author can access their own book even if DOB is under 18
        assertTrue(spyService.canAccess(matureBook));
    }

    @Test
    void validateAuthorCanPostRatingRequiresDOBForMature() {
        User authorWithoutDob = new User();
        authorWithoutDob.setId("author-no-dob");
        authorWithoutDob.setDateOfBirth(null);

        // ALL_AGES and TEEN_13 do not require DOB
        assertDoesNotThrow(() -> service.validateAuthorCanPostRating(authorWithoutDob, AgeRating.ALL_AGES));
        assertDoesNotThrow(() -> service.validateAuthorCanPostRating(authorWithoutDob, AgeRating.TEEN_13));

        // MATURE_18 and ADULT_21 require DOB
        org.springframework.web.server.ResponseStatusException ex1 = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.validateAuthorCanPostRating(authorWithoutDob, AgeRating.MATURE_18)
        );
        assertEquals(400, ex1.getStatusCode().value());
        assertTrue(ex1.getReason().contains("Date of birth is required"));

        org.springframework.web.server.ResponseStatusException ex2 = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.validateAuthorCanPostRating(authorWithoutDob, AgeRating.ADULT_21)
        );
        assertEquals(400, ex2.getStatusCode().value());
    }

    @Test
    void validateAuthorCanPostRatingRejectsUnderageAuthorsForMature() {
        User minorAuthor = new User();
        minorAuthor.setId("minor-author");
        minorAuthor.setDateOfBirth(LocalDate.now().minusYears(16)); // 16 years old

        org.springframework.web.server.ResponseStatusException ex = assertThrows(
                org.springframework.web.server.ResponseStatusException.class,
                () -> service.validateAuthorCanPostRating(minorAuthor, AgeRating.MATURE_18)
        );
        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("at least 18 years old"));
    }

    @Test
    void validateAuthorCanPostRatingAcceptsAdultAuthors() {
        User adultAuthor = new User();
        adultAuthor.setId("adult-author");
        adultAuthor.setDateOfBirth(LocalDate.now().minusYears(22)); // 22 years old

        assertDoesNotThrow(() -> service.validateAuthorCanPostRating(adultAuthor, AgeRating.MATURE_18));
        assertDoesNotThrow(() -> service.validateAuthorCanPostRating(adultAuthor, AgeRating.ADULT_21));
    }
}
