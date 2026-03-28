
package com.wordweft.book.controller;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.Comment;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CommentRepository;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/books")
public class CommentController {

    @Autowired
    CommentRepository commentRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    BookRepository bookRepository;
    @Autowired
    NotificationService notificationService;

    @GetMapping("/{bookId}/chapters/{chapterId}/comments")
    public ResponseEntity<?> getComments(@PathVariable String bookId, @PathVariable String chapterId) {
        List<Comment> comments = commentRepository.findByChapterIdOrderByCreatedAtDesc(chapterId);
        return ResponseEntity.ok(comments.stream().map(this::enrichComment).collect(Collectors.toList()));
    }

    @PostMapping("/{bookId}/chapters/{chapterId}/comments")
    public ResponseEntity<?> addComment(@PathVariable String bookId, @PathVariable String chapterId,
            @Valid @RequestBody Comment comment) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication()
                .getPrincipal();

        comment.setUserId(userDetails.getId());
        comment.setBookId(bookId);
        comment.setChapterId(chapterId);
        comment.setCreatedAt(LocalDateTime.now());

        commentRepository.save(comment);

        // Increment chapter comment count
        Book book = bookRepository.findById(bookId).orElseThrow();
        Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(chapterId)).findFirst()
                .orElseThrow();
        chapter.setCommentCount(chapter.getCommentCount() + 1);
        bookRepository.save(book);

        // --- Notification Triggers ---
        User commenter = userRepository.findById(userDetails.getId()).orElse(null);
        String commenterName = commenter != null ? commenter.getUsername() : "Someone";

        // If this is a reply, notify the parent commenter
        if (comment.getParentId() != null) {
            commentRepository.findById(comment.getParentId()).ifPresent(parent -> {
                if (!parent.getUserId().equals(userDetails.getId())) {
                    java.util.Map<String, String> meta = new java.util.HashMap<>();
                    meta.put("actorName", commenterName);
                    meta.put("actorAvatar", commenter != null ? commenter.getAvatarUrl() : "");
                    meta.put("bookTitle", book.getTitle());
                    meta.put("bookId", bookId);
                    meta.put("chapterId", chapterId);
                    notificationService.createNotification(
                            parent.getUserId(), userDetails.getId(), "COMMENT_REPLY", "CHAPTER",
                            chapterId, commenterName + " replied to your comment", meta);
                }
            });
        }

        // Notify book author about new comment
        if (!book.getAuthorId().equals(userDetails.getId())) {
            java.util.Map<String, String> meta = new java.util.HashMap<>();
            meta.put("actorName", commenterName);
            meta.put("actorAvatar", commenter != null ? commenter.getAvatarUrl() : "");
            meta.put("bookTitle", book.getTitle());
            meta.put("bookId", bookId);
            meta.put("chapterId", chapterId);
            notificationService.createNotification(
                    book.getAuthorId(), userDetails.getId(), "NEW_COMMENT", "CHAPTER",
                    chapterId, commenterName + " commented on \"" + chapter.getTitle() + "\"", meta);
        }

        return ResponseEntity.ok(enrichComment(comment));
    }

    private Map<String, Object> enrichComment(Comment comment) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("bookId", comment.getBookId());
        map.put("chapterId", comment.getChapterId());
        map.put("paragraphIndex", comment.getParagraphIndex());
        map.put("parentId", comment.getParentId());
        map.put("content", comment.getContent());
        map.put("createdAt", comment.getCreatedAt());
        map.put("userId", comment.getUserId());

        User user = userRepository.findById(comment.getUserId()).orElse(new User());
        Map<String, String> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getUsername());
        userMap.put("avatarUrl", user.getAvatarUrl());
        map.put("user", userMap);

        return map;
    }
}
