
package com.wordweft.book.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookService {
    @Autowired BookRepository bookRepository;
    @Autowired UserRepository userRepository;
    @Autowired ReviewRepository reviewRepository;

    public List<Map<String, Object>> getAllBooks(List<String> genres, String sortBy) {
        List<Book> books = bookRepository.findByPublicationStatus("published");
        
        if (genres != null && !genres.isEmpty()) {
            books = books.stream()
                    .filter(b -> new HashSet<>(b.getGenres()).containsAll(genres))
                    .collect(Collectors.toList());
        }
        
        // Sorting logic
        if ("Rating".equals(sortBy)) {
            books.sort((a, b) -> Double.compare(b.getRating(), a.getRating()));
        } else if ("Popular".equals(sortBy)) {
            books.sort((a, b) -> Integer.compare(b.getReviewsCount(), a.getReviewsCount()));
        } else {
            // Recent
            books.sort((a, b) -> {
                if (a.getPublishedDate() == null) return 1;
                if (b.getPublishedDate() == null) return -1;
                return b.getPublishedDate().compareTo(a.getPublishedDate());
            });
        }
        
        return books.stream().map(this::enrichBook).collect(Collectors.toList());
    }
    
    public Map<String, Object> getBookById(String id) {
        return bookRepository.findById(id).map(this::enrichBook).orElse(null);
    }
    
    public List<Map<String, Object>> getBooksByAuthor(String authorId) {
        return bookRepository.findByAuthorId(authorId).stream()
                .filter(b -> "published".equals(b.getPublicationStatus()))
                .map(this::enrichBook)
                .collect(Collectors.toList());
    }
    
    // Helper to add Author object to Book response
    private Map<String, Object> enrichBook(Book book) {
        Map<String, Object> map = new HashMap<>();
        // Copy book fields
        map.put("id", book.getId());
        map.put("title", book.getTitle());
        map.put("coverUrl", book.getCoverUrl());
        map.put("rating", book.getRating());
        map.put("reviewsCount", book.getReviewsCount());
        map.put("genres", book.getGenres());
        map.put("tags", book.getTags());
        map.put("summary", book.getSummary());
        map.put("description", book.getDescription());
        map.put("chapters", book.getChapters());
        map.put("readingStatus", book.getReadingStatus());
        map.put("publicationStatus", book.getPublicationStatus());
        map.put("publishedDate", book.getPublishedDate());
        map.put("isMature", book.isMature());
        
        // Enrich Author
        User author = userRepository.findById(book.getAuthorId()).orElse(new User());
        Map<String, Object> authorMap = new HashMap<>();
        authorMap.put("id", author.getId());
        authorMap.put("name", author.getUsername()); // Or display name
        authorMap.put("avatarUrl", author.getAvatarUrl());
        authorMap.put("bio", author.getBio());
        
        map.put("author", authorMap);
        return map;
    }
    
    public List<String> getAllGenres() {
        Set<String> genres = new HashSet<>();
        bookRepository.findAll().forEach(b -> genres.addAll(b.getGenres()));
        List<String> list = new ArrayList<>(genres);
        Collections.sort(list);
        return list;
    }
}
