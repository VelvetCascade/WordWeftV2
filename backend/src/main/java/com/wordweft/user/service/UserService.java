
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
        return enrichUser(user);
    }
    
    public Map<String, Object> getPublicProfile(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getUsername());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("bio", user.getBio());
        // Do not expose email or library for public profile
        return map;
    }

    public Map<String, Object> enrichUser(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("bio", user.getBio());
        map.put("location", user.getLocation());
        map.put("website", user.getWebsite());
        map.put("joinDate", user.getJoinDate());
        map.put("stats", user.getStats());
        
        // Populate Written Books (All books, including drafts)
        List<Book> written = bookRepository.findByAuthorId(user.getId());
        map.put("writtenBooks", written);
        
        // Populate Library
        List<LibraryEntry> entries = libraryRepository.findByUserId(user.getId());
        List<Map<String, Object>> shelf = new ArrayList<>();
        Map<String, Object> shelfObj = new HashMap<>();
        shelfObj.put("id", "1");
        shelfObj.put("name", "My List");
        
        List<Map<String, Object>> books = entries.stream().map(e -> {
            Map<String, Object> b = bookService.getBookById(e.getBookId());
            if (b != null) {
                b.put("addedDate", e.getAddedDate());
            }
            return b;
        }).filter(Objects::nonNull).collect(Collectors.toList());
        
        shelfObj.put("books", books);
        shelf.add(shelfObj);
        
        map.put("library", shelf);
        
        return map;
    }
}
