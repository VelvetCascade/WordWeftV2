
package com.wordweft.user.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.LibraryEntry;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.LibraryRepository;
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

    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;
    @Autowired LibraryRepository libraryRepository;
    @Autowired BookService bookService;

    public Map<String, Object> getUserProfile(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return enrichUser(user, userId);
    }
    
    public Map<String, Object> getPublicProfile(String targetUserId, String currentUserId) {
        User user = userRepository.findById(targetUserId).orElseThrow(() -> new RuntimeException("User not found"));
        // Basic enrichment for public view
        return enrichUser(user, currentUserId);
    }

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
            if (totalWords > 500000) level = "Sage";
            else if (totalWords > 200000) level = "Scholar";
            else if (totalWords > 50000) level = "Bookworm";
            else if (totalWords > 10000) level = "Apprentice";
            stats.put("readerLevel", level);
            
            stats.put("favoriteGenres", user.getStats().getFavoriteGenres());
        }
        map.put("stats", stats);
        
        // Populate Written Books
        List<Book> written = bookRepository.findByAuthorId(user.getId());
        map.put("writtenBooks", written);
        
        // Populate Library
        List<LibraryEntry> entries = libraryRepository.findByUserId(user.getId());
        List<Map<String, Object>> shelf = new ArrayList<>();
        Map<String, Object> shelfObj = new HashMap<>();
        shelfObj.put("id", "1");
        shelfObj.put("name", "My List");
        
        List<Map<String, Object>> books = entries.stream().map(e -> {
            Map<String, Object> b = bookService.getBookById(e.getBookId(), false);
            if (b != null) {
                b.put("addedDate", e.getAddedDate());
            }
            return b;
        }).filter(Objects::nonNull).collect(Collectors.toList());
        
        shelfObj.put("books", books);
        shelf.add(shelfObj);
        map.put("library", shelf);
        
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
        if (ids.isEmpty()) return new ArrayList<>();
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
