package com.wordweft.growth.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.growth.dto.GenreEventResponse;
import com.wordweft.growth.model.GenreEvent;
import com.wordweft.growth.repository.GenreEventRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class GenreEventService {
    private final GenreEventRepository events;
    private final BookRepository books;
    private final UserRepository users;

    public GenreEventService(GenreEventRepository events, BookRepository books, UserRepository users) {
        this.events = events;
        this.books = books;
        this.users = users;
    }

    public List<GenreEventResponse> publicEvents(Instant now) {
        return events.findByStatusOrderByStartAtAsc("published").stream()
                .filter(event -> event.getEndAt() == null || !event.getEndAt().isBefore(now))
                .map(event -> toResponse(event, now)).toList();
    }

    public GenreEventResponse submit(String userId, String eventId, String bookId, Instant now) {
        GenreEvent event = events.findById(eventId).orElseThrow(() -> new IllegalArgumentException("Event not found"));
        if (!"published".equalsIgnoreCase(event.getStatus()) || event.getStartAt() == null || event.getEndAt() == null
                || now.isBefore(event.getStartAt()) || now.isAfter(event.getEndAt())) {
            throw new IllegalArgumentException("This event is not accepting submissions");
        }
        Book book = books.findById(bookId).orElseThrow(() -> new IllegalArgumentException("Story not found"));
        if (!userId.equals(book.getAuthorId())) throw new AccessDeniedException("You can submit only your own story");
        if (!"published".equalsIgnoreCase(book.getPublicationStatus())) {
            throw new IllegalArgumentException("Publish the story before submitting it");
        }
        boolean genreMatches = book.getGenres() != null && book.getGenres().stream()
                .anyMatch(genre -> genre != null && genre.equalsIgnoreCase(event.getGenre()));
        if (!genreMatches) throw new IllegalArgumentException("The story must match the event genre");

        if (event.getBookIds() == null) event.setBookIds(new ArrayList<>());
        if (!event.getBookIds().contains(bookId)) {
            event.getBookIds().add(bookId);
            events.save(event);
        }
        return toResponse(event, now);
    }

    public GenreEventResponse create(String actorId, EventMutation request, Instant now) {
        requireStaff(actorId);
        validate(request);
        GenreEvent event = new GenreEvent();
        apply(event, request);
        event.setCreatedBy(actorId);
        event.setCreatedAt(now);
        event.setBookIds(new ArrayList<>());
        return toResponse(events.save(event), now);
    }

    public GenreEventResponse update(String actorId, String eventId, EventMutation request, Instant now) {
        requireStaff(actorId);
        validate(request);
        GenreEvent event = events.findById(eventId).orElseThrow(() -> new IllegalArgumentException("Event not found"));
        apply(event, request);
        return toResponse(events.save(event), now);
    }

    private void apply(GenreEvent event, EventMutation request) {
        event.setTitle(request.title().trim());
        event.setGenre(request.genre().trim());
        event.setPrompt(request.prompt() == null ? "" : request.prompt().trim());
        event.setDescription(request.description() == null ? "" : request.description().trim());
        event.setStartAt(request.startAt());
        event.setEndAt(request.endAt());
        event.setStatus(request.status() == null ? "draft" : request.status().toLowerCase(Locale.ROOT));
    }

    private void validate(EventMutation request) {
        if (request == null || request.title() == null || request.title().isBlank()
                || request.genre() == null || request.genre().isBlank()) {
            throw new IllegalArgumentException("Title and genre are required");
        }
        if (request.startAt() == null || request.endAt() == null || !request.endAt().isAfter(request.startAt())) {
            throw new IllegalArgumentException("Event end time must be after its start time");
        }
        if (request.status() != null && !Set.of("draft", "published", "closed").contains(request.status().toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Event status must be draft, published, or closed");
        }
    }

    private void requireStaff(String actorId) {
        User user = users.findById(actorId).orElseThrow(() -> new AccessDeniedException("Staff access required"));
        Set<String> roles = user.getRoles() == null ? Set.of() : user.getRoles();
        if (!roles.contains("ROLE_ADMIN") && !roles.contains("ROLE_MODERATOR")) {
            throw new AccessDeniedException("Staff access required");
        }
    }

    private GenreEventResponse toResponse(GenreEvent event, Instant now) {
        List<GenreEventResponse.EventStory> stories = event.getBookIds() == null ? List.of() : event.getBookIds().stream()
                .map(books::findById).flatMap(java.util.Optional::stream)
                .filter(book -> "published".equalsIgnoreCase(book.getPublicationStatus()))
                .map(book -> new GenreEventResponse.EventStory(book.getId(), book.getTitle(), book.getCoverUrl(),
                        book.getAuthorId(), users.findById(book.getAuthorId()).map(User::getUsername).orElse("WordWeft Writer")))
                .toList();
        String timing = now.isBefore(event.getStartAt()) ? "upcoming" : now.isAfter(event.getEndAt()) ? "ended" : "active";
        return new GenreEventResponse(event.getId(), event.getTitle(), event.getGenre(), event.getPrompt(),
                event.getDescription(), event.getStartAt(), event.getEndAt(), timing, stories);
    }

    public record EventMutation(String title, String genre, String prompt, String description,
                                Instant startAt, Instant endAt, String status) {}
}
