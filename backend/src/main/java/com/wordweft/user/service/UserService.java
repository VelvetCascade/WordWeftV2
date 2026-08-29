
package com.wordweft.user.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
import com.wordweft.book.repository.ShelfRepository;
import com.wordweft.book.service.BookService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    UserRepository userRepository;
    @Autowired
    BookRepository bookRepository;
    @Autowired
    LibraryRepository libraryRepository;
    @Autowired
    BookService bookService;

    public Map<String, Object> getUserProfile(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return enrichUser(user, userId);
    }

    public Map<String, Object> getPublicProfile(String targetUserId, String currentUserId) {
        User user = userRepository.findById(targetUserId).orElseThrow(() -> new RuntimeException("User not found"));
        // Public profiles must not hydrate a member's private library. Besides leaking
        // reading history, that made an otherwise public profile fail when a shelf
        // contained a story the viewer was not old enough to access.
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("bio", user.getBio());
        map.put("location", user.getLocation());
        map.put("website", user.getWebsite());
        map.put("joinDate", user.getJoinDate());
        map.put("followersCount", user.getFollowers().size());
        map.put("followingCount", user.getFollowing().size());
        map.put("socials", user.getSocials());
        map.put("favoriteGenres", user.getFavoriteGenres());
        map.put("communityInterests", user.getCommunityInterests() == null ? Set.of() : user.getCommunityInterests());
        map.put("communityBadges", user.getCommunityBadges() == null ? Set.of() : user.getCommunityBadges());
        Map<String, Object> stats = new HashMap<>();
        if (user.getStats() != null) {
            stats.put("booksRead", user.getStats().getBooksRead());
            stats.put("chaptersRead", user.getStats().getChaptersRead());
            stats.put("totalWordsRead", user.getStats().getTotalWordsRead());
            stats.put("readingTimeMinutes", user.getStats().getTotalWordsRead() / 250);
            stats.put("favoriteGenres", user.getStats().getFavoriteGenres());
            long totalWords = user.getStats().getTotalWordsRead();
            String level = totalWords > 500000 ? "Sage" : totalWords > 200000 ? "Scholar"
                    : totalWords > 50000 ? "Bookworm" : totalWords > 10000 ? "Apprentice" : "Novice";
            stats.put("readerLevel", level);
        }
        map.put("stats", stats);
        map.put("isFollowing", currentUserId != null && user.getFollowers().contains(currentUserId));
        return map;
    }

    @Autowired
    ShelfRepository shelfRepository;
    @Autowired
    com.wordweft.book.repository.ReadingProgressRepository readingProgressRepository;

    public Map<String, Object> enrichUser(User user, String currentViewerId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("bio", user.getBio());
        map.put("location", user.getLocation());
        map.put("website", user.getWebsite());
        map.put("joinDate", user.getJoinDate());
        map.put("followersCount", user.getFollowers().size());
        map.put("followingCount", user.getFollowing().size());

        map.put("socials", user.getSocials());
        map.put("favoriteGenres", user.getFavoriteGenres());
        map.put("communityInterests", user.getCommunityInterests() == null ? Set.of() : user.getCommunityInterests());
        map.put("communityBadges", user.getCommunityBadges() == null ? Set.of() : user.getCommunityBadges());
        map.put("hasSeenWritingDemo", user.isHasSeenWritingDemo());
        if (user.getId().equals(currentViewerId)) {
            map.put("dateOfBirth", user.getDateOfBirth());
            map.put("allowMatureContent", user.isAllowMatureContent());
        }

        // Stats Logic
        Map<String, Object> stats = new HashMap<>();
        if (user.getStats() != null) {
            stats.put("booksRead", user.getStats().getBooksRead());
            stats.put("chaptersRead", user.getStats().getChaptersRead());
            stats.put("totalWordsRead", user.getStats().getTotalWordsRead());

            // Calculate Reading Time (assuming 250 wpm)
            long totalWords = user.getStats().getTotalWordsRead();
            long readingTimeMinutes = totalWords / 250;
            stats.put("readingTimeMinutes", readingTimeMinutes);

            // Calculate Reader Level
            String level = "Novice";
            if (totalWords > 500000)
                level = "Sage";
            else if (totalWords > 200000)
                level = "Scholar";
            else if (totalWords > 50000)
                level = "Bookworm";
            else if (totalWords > 10000)
                level = "Apprentice";
            stats.put("readerLevel", level);

            stats.put("favoriteGenres", user.getStats().getFavoriteGenres());
        }
        map.put("stats", stats);

        // Populate Written Books — use BookService to enrich each book so the
        // nested `author` object (id, name, avatarUrl, bio) is included.
        // Raw Book entities only store authorId, not the resolved author object.
        List<Book> written = bookRepository.findByAuthorId(user.getId());
        List<Map<String, Object>> writtenEnriched = written.stream()
                .map(b -> bookService.getBookById(b.getId(), false))
                .filter(b -> b != null)
                .collect(Collectors.toList());
        map.put("writtenBooks", writtenEnriched);

        // Populate Library
        List<LibraryEntry> entries = libraryRepository.findByUserId(user.getId());
        List<com.wordweft.book.model.Shelf> customShelves = shelfRepository.findByUserId(user.getId());

        // Fetch all reading progress
        List<com.wordweft.book.model.ReadingProgress> progressList = readingProgressRepository
                .findByUserId(user.getId());
        Map<String, com.wordweft.book.model.ReadingProgress> progressMap = progressList.stream()
                .collect(Collectors.toMap(com.wordweft.book.model.ReadingProgress::getBookId, p -> p));

        List<Map<String, Object>> shelves = new ArrayList<>();

        // 1. Default "All Books" Shelf (conceptually "My List" or "All")
        // We can keep the existing behavior or just have "All Books" be implicit in
        // frontend.
        // Let's model it as a shelf for consistency.
        Map<String, Object> allBooksShelf = new HashMap<>();
        allBooksShelf.put("id", "all");
        allBooksShelf.put("name", "All Books");

        List<Map<String, Object>> allBooks = new ArrayList<>();
        List<Map<String, Object>> readingBooks = new ArrayList<>();
        List<Map<String, Object>> toReadBooks = new ArrayList<>();
        List<Map<String, Object>> completedBooks = new ArrayList<>();

        // Map to hold books for efficient lookup and shelf assignment
        Map<String, Map<String, Object>> bookMap = new HashMap<>();

        for (LibraryEntry e : entries) {
            Map<String, Object> b = bookService.getBookById(e.getBookId(), false);
            if (b != null) {
                b.put("addedDate", e.getAddedDate());
                b.put("libraryEntryId", e.getId());

                com.wordweft.book.model.ReadingProgress p = progressMap.get(e.getBookId());
                int progress = p != null ? p.getOverallProgress() : 0;
                b.put("progress", progress);

                allBooks.add(b);
                bookMap.put(e.getBookId(), b);

                if (progress >= 100) {
                    completedBooks.add(b);
                } else if (progress > 0) {
                    readingBooks.add(b);
                } else {
                    toReadBooks.add(b);
                }
            }
        }
        allBooksShelf.put("books", allBooks);
        shelves.add(allBooksShelf);

        // Add System Shelves
        Map<String, Object> readingShelf = new HashMap<>();
        readingShelf.put("id", "reading");
        readingShelf.put("name", "Reading");
        readingShelf.put("books", readingBooks);
        shelves.add(readingShelf);

        Map<String, Object> toReadShelf = new HashMap<>();
        toReadShelf.put("id", "toread");
        toReadShelf.put("name", "To Read");
        toReadShelf.put("books", toReadBooks);
        shelves.add(toReadShelf);

        Map<String, Object> completedShelf = new HashMap<>();
        completedShelf.put("id", "completed");
        completedShelf.put("name", "Completed");
        completedShelf.put("books", completedBooks);
        shelves.add(completedShelf);

        // Add Custom Shelves
        for (com.wordweft.book.model.Shelf s : customShelves) {
            Map<String, Object> shelfMap = new HashMap<>();
            shelfMap.put("id", s.getId());
            shelfMap.put("name", s.getName());

            List<Map<String, Object>> shelfBooks = new ArrayList<>();
            // LibraryEntry now has shelfIds
            for (LibraryEntry e : entries) {
                if (e.getShelfIds() != null && e.getShelfIds().contains(s.getId())) {
                    if (bookMap.containsKey(e.getBookId())) {
                        shelfBooks.add(bookMap.get(e.getBookId()));
                    }
                }
            }
            shelfMap.put("books", shelfBooks);
            shelves.add(shelfMap);
        }

        map.put("library", shelves);

        map.put("following", new ArrayList<>(user.getFollowing()));
        if (currentViewerId != null) {
            map.put("isFollowing", user.getFollowers().contains(currentViewerId));
        }

        return map;
    }

    @Transactional
    public void followUser(String followerId, String targetId) {
        User follower = userRepository.findById(followerId).orElseThrow();
        User target = userRepository.findById(targetId).orElseThrow();

        follower.getFollowing().add(targetId);
        target.getFollowers().add(followerId);

        userRepository.save(follower);
        userRepository.save(target);
    }

    @Transactional
    public void unfollowUser(String followerId, String targetId) {
        User follower = userRepository.findById(followerId).orElseThrow();
        User target = userRepository.findById(targetId).orElseThrow();

        follower.getFollowing().remove(targetId);
        target.getFollowers().remove(followerId);

        userRepository.save(follower);
        userRepository.save(target);
    }

    public List<Map<String, Object>> getFollowersList(String userId, String currentViewerId) {
        User user = userRepository.findById(userId).orElseThrow();
        return getUsersFromIds(user.getFollowers(), currentViewerId);
    }

    public List<Map<String, Object>> getFollowingList(String userId, String currentViewerId) {
        User user = userRepository.findById(userId).orElseThrow();
        return getUsersFromIds(user.getFollowing(), currentViewerId);
    }

    private List<Map<String, Object>> getUsersFromIds(Set<String> ids, String currentViewerId) {
        if (ids.isEmpty())
            return new ArrayList<>();
        List<User> users = userRepository.findAllById(ids);

        User viewer = (currentViewerId != null) ? userRepository.findById(currentViewerId).orElse(null) : null;
        Set<String> viewerFollowing = (viewer != null) ? viewer.getFollowing() : new HashSet<>();

        return users.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getUsername());
            m.put("avatarUrl", u.getAvatarUrl());
            m.put("bio", u.getBio());
            m.put("isFollowing", viewerFollowing.contains(u.getId()));
            return m;
        }).collect(Collectors.toList());
    }
}
