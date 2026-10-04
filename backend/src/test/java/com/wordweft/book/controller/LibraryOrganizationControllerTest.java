package com.wordweft.book.controller;

import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.model.Shelf;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ShelfRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.service.UserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LibraryOrganizationControllerTest {
    private final ShelfRepository shelves = mock(ShelfRepository.class);
    private final LibraryRepository library = mock(LibraryRepository.class);
    private final UserService users = mock(UserService.class);
    private final LibraryController controller = new LibraryController();
    @BeforeEach void setup() {
        ReflectionTestUtils.setField(controller,"shelfRepository",shelves);
        ReflectionTestUtils.setField(controller,"libraryRepository",library);
        ReflectionTestUtils.setField(controller,"userService",users);
        var principal = new UserDetailsImpl("reader","Reader","reader@example.test","hash",List.of());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal,"",List.of()));
        when(shelves.findByUserId("reader")).thenReturn(List.of(shelf("owned","reader")));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    private Shelf shelf(String id, String owner) { Shelf shelf = new Shelf(owner,"Shelf"); shelf.setId(id); return shelf; }
    @Test void omittedVisibilityIsPrivateAndPublicRequiresAnExplicitChoice() {
        assertEquals(HttpStatus.OK,controller.createShelf(Map.of("name","Quiet reads")).getStatusCode());
        verify(shelves).save(argThat(shelf -> "PRIVATE".equals(shelf.getVisibility())));
        assertEquals(HttpStatus.OK,controller.createShelf(Map.of("name","Shared reads","visibility","PUBLIC")).getStatusCode());
        verify(shelves).save(argThat(shelf -> "PUBLIC".equals(shelf.getVisibility())));
        assertEquals(HttpStatus.BAD_REQUEST,controller.createShelf(Map.of("name","Bad","visibility","UNKNOWN")).getStatusCode());
    }
    @Test void foreignShelvesCannotBeSelectedOrHaveTheirVisibilityChanged() {
        assertEquals(HttpStatus.BAD_REQUEST,controller.updateBookShelves("book",Map.of("shelfIds",List.of("foreign"))).getStatusCode());
        when(shelves.findById("foreign")).thenReturn(Optional.of(shelf("foreign","other")));
        assertEquals(HttpStatus.NOT_FOUND,controller.changeVisibility("foreign",Map.of("visibility","PUBLIC")).getStatusCode());
        verify(library,never()).save(any()); verify(shelves,never()).save(any());
    }
    @Test void bulkAddAndRemovePreserveOtherShelfMemberships() {
        when(shelves.findById("owned")).thenReturn(Optional.of(shelf("owned","reader")));
        LibraryEntry entry = new LibraryEntry(); entry.setUserId("reader"); entry.setBookId("book"); entry.setShelfIds(new java.util.HashSet<>(Set.of("existing")));
        when(library.findByUserId("reader")).thenReturn(List.of(entry));
        assertEquals(HttpStatus.OK,controller.organizeBooks(new LibraryController.OrganizeRequest(List.of("book"),"owned","ADD")).getStatusCode());
        assertEquals(Set.of("existing","owned"),entry.getShelfIds());
        assertEquals(HttpStatus.OK,controller.organizeBooks(new LibraryController.OrganizeRequest(List.of("book"),"owned","REMOVE")).getStatusCode());
        assertEquals(Set.of("existing"),entry.getShelfIds());
    }
    @Test void deletingAnOwnedShelfDetachesOnlyItsMembershipAndKeepsBooksAndOtherShelves() {
        Shelf shelf = shelf("owned","reader"); when(shelves.findById("owned")).thenReturn(Optional.of(shelf));
        LibraryEntry entry = new LibraryEntry(); entry.setUserId("reader"); entry.setBookId("book");
        entry.setShelfIds(new java.util.HashSet<>(Set.of("existing","owned")));
        when(library.findByUserId("reader")).thenReturn(List.of(entry));
        assertEquals(HttpStatus.OK,controller.deleteShelf("owned").getStatusCode());
        assertEquals(Set.of("existing"),entry.getShelfIds());
        verify(library).saveAll(List.of(entry)); verify(shelves).delete(shelf);
        verify(library,never()).delete(any());
    }
    @Test void foreignShelfDeletionDoesNotChangeAnyLibraryEntry() {
        when(shelves.findById("foreign")).thenReturn(Optional.of(shelf("foreign","other")));
        assertEquals(HttpStatus.NOT_FOUND,controller.deleteShelf("foreign").getStatusCode());
        verifyNoInteractions(library); verify(shelves,never()).delete(any());
    }
    @Test void bulkValidationCompletesBeforeSavingAnyMembership() {
        when(shelves.findById("owned")).thenReturn(Optional.of(shelf("owned","reader")));
        when(library.findByUserId("reader")).thenReturn(List.of());
        assertEquals(HttpStatus.BAD_REQUEST,controller.organizeBooks(new LibraryController.OrganizeRequest(List.of("missing"),"owned","ADD")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST,controller.organizeBooks(new LibraryController.OrganizeRequest(List.of(),"owned","ADD")).getStatusCode());
        verify(library,never()).saveAll(any());
    }
}
