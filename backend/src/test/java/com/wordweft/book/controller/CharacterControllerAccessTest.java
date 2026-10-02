package com.wordweft.book.controller;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.book.model.Character;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CharacterRepository;
import com.wordweft.book.service.CharacterService;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.config.SecurityConfig;
import com.wordweft.config.WebMvcConfig;
import com.wordweft.security.jwt.AuthEntryPointJwt;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.security.services.UserDetailsServiceImpl;
import com.wordweft.support.ImageKitService;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CharacterController.class, excludeFilters =
        @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = WebMvcConfig.class))
@Import({SecurityConfig.class, AuthEntryPointJwt.class, CharacterService.class, ContentAccessService.class})
class CharacterControllerAccessTest {
    @Autowired private MockMvc mvc;
    @MockBean private CharacterRepository characters;
    @MockBean private BookRepository books;
    @MockBean private UserRepository users;
    @MockBean private ImageKitService images;
    @MockBean private JwtUtils jwtUtils;
    @MockBean private UserDetailsServiceImpl userDetails;
    private Book book;

    @BeforeEach
    void setUp() {
        book = new Book(); book.setId("story"); book.setAuthorId("owner"); book.setPublicationStatus("published");
        Character character = new Character();
        character.setId("cast-member"); character.setBookId("story"); character.setName("Elaria");
        character.setDescription("A reader-visible navigator"); character.setGoal("AUTHOR_PRIVATE_PLAN");
        character.setImageFileId("PRIVATE_STORAGE_ID");
        when(books.findById("story")).thenReturn(Optional.of(book));
        when(characters.findByBookId("story")).thenReturn(List.of(character));
        when(characters.findById("cast-member")).thenReturn(Optional.of(character));
        when(characters.save(any(Character.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void actualSecurityChainAllowsOnlySafePublishedGuestReads() throws Exception {
        mvc.perform(get("/api/characters/book/story"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Elaria"))
                .andExpect(jsonPath("$[0].goal").doesNotExist())
                .andExpect(jsonPath("$[0].imageFileId").doesNotExist())
                .andExpect(header().string("Cache-Control", containsString("private")))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(header().stringValues("Vary", hasItem(containsString("Authorization"))));
        mvc.perform(get("/api/characters/cast-member"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Elaria"))
                .andExpect(jsonPath("$.goal").doesNotExist());
    }

    @Test
    void actualSecurityChainKeepsGuestMutationsAuthenticated() throws Exception {
        mvc.perform(post("/api/characters").contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookId\":\"story\",\"name\":\"New cast member\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/characters/cast-member").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Changed\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/characters/cast-member")).andExpect(status().isUnauthorized());
        verify(characters, never()).save(any());
        verify(characters, never()).deleteById(any());
    }

    @Test
    void ownerProjectionKeepsPrivateEditingFieldsWithoutSharedCaching() throws Exception {
        mvc.perform(get("/api/characters/book/story").with(account("owner")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].goal").value("AUTHOR_PRIVATE_PLAN"))
                .andExpect(jsonPath("$[0].imageFileId").value("PRIVATE_STORAGE_ID"))
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andExpect(header().stringValues("Vary", hasItem(containsString("Authorization"))));
    }

    @Test
    void draftReadsAreNotFoundForGuestsAndOtherAccounts() throws Exception {
        book.setPublicationStatus("draft");
        mvc.perform(get("/api/characters/book/story")).andExpect(status().isNotFound());
        mvc.perform(get("/api/characters/cast-member").with(account("reader"))).andExpect(status().isNotFound());
        mvc.perform(get("/api/characters/book/story").with(account("owner"))).andExpect(status().isOk());
    }

    @Test
    void matureGuestReadUsesTheSharedRestrictionResponse() throws Exception {
        book.setAgeRating(AgeRating.MATURE_18);
        mvc.perform(get("/api/characters/book/story")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("MATURE_CONTENT_RESTRICTED"));
    }

    @Test
    void authenticatedNonOwnerCannotCreateUpdateOrDeleteTheCast() throws Exception {
        mvc.perform(post("/api/characters").with(account("reader")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookId\":\"story\",\"name\":\"Intruder\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/characters/cast-member").with(account("reader")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Intruder\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/characters/cast-member").with(account("reader"))).andExpect(status().isForbidden());
        verify(characters, never()).save(any());
        verify(characters, never()).deleteById(any());
        verifyNoInteractions(images);
    }

    private static RequestPostProcessor account(String id) {
        return user(new UserDetailsImpl(id, id, id + "@example.test", "hash", List.of()));
    }
}
