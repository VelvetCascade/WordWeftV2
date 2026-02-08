
package com.wordweft.book.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BookService {
    @Autowired BookRepository bookRepository;
    @Autowired UserRepository userRepository;
    @Autowired ReviewRepository reviewRepository;

    private String getCurrentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof UserDetailsImpl) {
                return ((UserDetailsImpl) principal).getId();
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

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
            // Sort by popularity score (views + likes + reviews)
            books.sort((a, b) -> {
                int scoreA = (a.getViewCount() / 10) + (a.getLikes().size() * 2) + a.getReviewsCount();
                int scoreB = (b.getViewCount() / 10) + (b.getLikes().size() * 2) + b.getReviewsCount();
                return Integer.compare(scoreB, scoreA);
            });
        } else {
            // Recent
            books.sort((a, b) -> {
                if (a.getPublishedDate() == null) return 1;
                if (b.getPublishedDate() == null) return -1;
                return b.getPublishedDate().compareTo(a.getPublishedDate());
            });
        }
        
        String currentUserId = getCurrentUserId();
        return books.stream().map(b -> enrichBook(b, currentUserId)).collect(Collectors.toList());
    }
    
    public Map<String, Object> getBookById(String id) {
        String currentUserId = getCurrentUserId();
        // Increment view count when fetching single book details
        Optional<Book> bookOpt = bookRepository.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setViewCount((book.getViewCount() == null ? 0 : book.getViewCount()) + 1);
            bookRepository.save(book);
            return enrichBook(book, currentUserId);
        }
        return null;
    }
    
    public List<Map<String, Object>> getBooksByAuthor(String authorId) {
        String currentUserId = getCurrentUserId();
        return bookRepository.findByAuthorId(authorId).stream()
                .filter(b -> "published".equals(b.getPublicationStatus()))
                .map(b -> enrichBook(b, currentUserId))
                .collect(Collectors.toList());
    }
    
    private Map<String, Object> enrichBook(Book book, String currentUserId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", book.getId());
        map.put("title", book.getTitle());
        map.put("coverUrl", book.getCoverUrl());
        map.put("rating", book.getRating());
        map.put("reviewsCount", book.getReviewsCount());
        
        // Book Stats
        map.put("viewCount", book.getViewCount() == null ? 0 : book.getViewCount());
        map.put("likesCount", book.getLikes().size());
        map.put("isLiked", currentUserId != null && book.getLikes().contains(currentUserId));
        
        map.put("genres", book.getGenres());
        map.put("tags", book.getTags());
        map.put("summary", book.getSummary());
        map.put("description", book.getDescription());
        
        // Enrich Chapters
        List<Map<String, Object>> enrichedChapters = book.getChapters().stream().map(ch -> {
            Map<String, Object> cMap = new HashMap<>();
            cMap.put("id", ch.getId());
            cMap.put("title", ch.getTitle());
            cMap.put("wordCount", ch.getWordCount());
            cMap.put("content", ch.getContent()); // In real app, might omit content for list view
            cMap.put("status", ch.getStatus());
            
            // Chapter Stats
            cMap.put("viewCount", ch.getViewCount());
            cMap.put("commentCount", ch.getCommentCount());
            cMap.put("likesCount", ch.getLikes().size());
            cMap.put("isLiked", currentUserId != null && ch.getLikes().contains(currentUserId));
            
            return cMap;
        }).collect(Collectors.toList());
        
        map.put("chapters", enrichedChapters);
        
        map.put("readingStatus", book.getReadingStatus());
        map.put("publicationStatus", book.getPublicationStatus());
        map.put("publishedDate", book.getPublishedDate());
        map.put("isMature", book.isMature());
        
        // Enrich Author
        User author = userRepository.findById(book.getAuthorId()).orElse(new User());
        Map<String, Object> authorMap = new HashMap<>();
        authorMap.put("id", author.getId());
        authorMap.put("name", author.getUsername()); 
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
