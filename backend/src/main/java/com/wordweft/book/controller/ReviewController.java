
package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Review;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.ReviewRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books")
public class ReviewController {

    @Autowired ReviewRepository reviewRepository;
    @Autowired UserRepository userRepository;
    @Autowired BookRepository bookRepository;

    @GetMapping("/{bookId}/reviews")
    public ResponseEntity<?> getReviews(@PathVariable String bookId) {
        List<Review> reviews = reviewRepository.findByBookId(bookId);
        return ResponseEntity.ok(reviews.stream().map(this::enrichReview).collect(Collectors.toList()));
    }
    
    @PostMapping("/{bookId}/reviews")
    public ResponseEntity<?> addReview(@PathVariable String bookId, @RequestBody Review review) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        review.setUserId(userDetails.getId());
        review.setBookId(bookId);
        review.setDate(LocalDate.now());
        review.setSentiment("positive"); // Mock sentiment analysis
        
        reviewRepository.save(review);
        updateBookStats(bookId);
        
        return getReviews(bookId);
    }
    
    @PostMapping("/{bookId}/reviews/{reviewId}/reply")
    public ResponseEntity<?> addReply(@PathVariable String bookId, @PathVariable String reviewId, @RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        Review review = reviewRepository.findById(reviewId).orElseThrow(() -> new RuntimeException("Review not found"));
        
        Review.Reply reply = new Review.Reply();
        reply.setUserId(userDetails.getId());
        reply.setContent(payload.get("content"));
        reply.setTimestamp(LocalDateTime.now());
        
        review.getReplies().add(reply);
        reviewRepository.save(review);
        
        return getReviews(bookId);
    }
    
    @DeleteMapping("/{bookId}/reviews")
    public ResponseEntity<?> deleteReview(@PathVariable String bookId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        reviewRepository.deleteByUserIdAndBookId(userDetails.getId(), bookId);
        updateBookStats(bookId);
        return getReviews(bookId);
    }
    
    private void updateBookStats(String bookId) {
        List<Review> reviews = reviewRepository.findByBookId(bookId);
        Book book = bookRepository.findById(bookId).orElseThrow();
        book.setReviewsCount(reviews.size());
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        book.setRating(Math.round(avg * 10.0) / 10.0);
        bookRepository.save(book);
    }
    
    private Map<String, Object> enrichReview(Review review) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", review.getId());
        map.put("bookId", review.getBookId());
        map.put("rating", review.getRating());
        map.put("comment", review.getComment());
        map.put("date", review.getDate());
        map.put("sentiment", review.getSentiment());
        map.put("userId", review.getUserId());
        
        User user = userRepository.findById(review.getUserId()).orElse(new User());
        map.put("user", getUserSummary(user));
        
        // Enrich Replies
        List<Map<String, Object>> enrichedReplies = review.getReplies().stream().map(reply -> {
            Map<String, Object> rMap = new HashMap<>();
            rMap.put("id", reply.getId());
            rMap.put("content", reply.getContent());
            rMap.put("timestamp", reply.getTimestamp());
            User replyUser = userRepository.findById(reply.getUserId()).orElse(new User());
            rMap.put("user", getUserSummary(replyUser));
            return rMap;
        }).collect(Collectors.toList());
        
        map.put("replies", enrichedReplies);
        
        return map;
    }
    
    private Map<String, String> getUserSummary(User user) {
        Map<String, String> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getUsername());
        userMap.put("avatarUrl", user.getAvatarUrl());
        return userMap;
    }
}
