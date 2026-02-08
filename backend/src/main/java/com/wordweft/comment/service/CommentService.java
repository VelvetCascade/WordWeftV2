package com.wordweft.comment.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.comment.model.Comment;
import com.wordweft.comment.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
// import java.util.Optional; 
import com.wordweft.comment.dto.CommentDto;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import java.util.stream.Collectors;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    @Transactional
    public CommentDto addComment(String userId, String bookId, String chapterId, String content,
            Integer paragraphIndex) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));

        boolean chapterExists = book.getChapters().stream().anyMatch(c -> c.getId().equals(chapterId));
        if (!chapterExists) {
            throw new RuntimeException("Chapter not found");
        }

        Comment comment = new Comment();
        comment.setUserId(userId);
        comment.setBookId(bookId);
        comment.setChapterId(chapterId);
        comment.setContent(content);
        comment.setParagraphIndex(paragraphIndex);

        Comment savedComment = commentRepository.save(comment);

        // Update stats
        updateStats(book, chapterId);

        // Fetch user for DTO
        User user = userRepository.findById(userId).orElse(null);
        return mapToDto(savedComment, user);
    }

    public List<CommentDto> getCommentsByChapter(String chapterId) {
        List<Comment> comments = commentRepository.findByChapterId(chapterId);

        // Batch fetch users to avoid N+1
        List<String> userIds = comments.stream().map(Comment::getUserId).distinct().collect(Collectors.toList());
        List<User> users = userRepository.findAllById(userIds);
        Map<String, User> userMap = users.stream().collect(Collectors.toMap(User::getId, u -> u));

        return comments.stream().map(c -> mapToDto(c, userMap.get(c.getUserId()))).collect(Collectors.toList());
    }

    private CommentDto mapToDto(Comment comment, User user) {
        CommentDto dto = new CommentDto();
        dto.setId(comment.getId());
        dto.setContent(comment.getContent());
        dto.setUserId(comment.getUserId());
        dto.setBookId(comment.getBookId());
        dto.setChapterId(comment.getChapterId());
        dto.setParagraphIndex(comment.getParagraphIndex());
        dto.setCreatedAt(comment.getCreatedAt());

        if (user != null) {
            dto.setUserName(user.getUsername()); // Assuming name or username
            dto.setUserAvatar(user.getAvatarUrl());
        }
        return dto;
    }

    private void updateStats(Book book, String chapterId) {
        // This is a simplified statistic update. In a high-traffic app we might use
        // increment operations.
        // For now, fetching count is acceptable or just incrementing.
        // Let's increment loosely for performance or do exact count if critical.
        // Given requirement "update instant", we can rely on frontend for immediate
        // feedback and backend for persistence.

        // Find chapter and increment
        book.getChapters().stream()
                .filter(c -> c.getId().equals(chapterId))
                .findFirst()
                .ifPresent(chapter -> {
                    chapter.setCommentCount(chapter.getCommentCount() + 1);
                });

        book.setCommentCount(book.getCommentCount() + 1);
        bookRepository.save(book);
    }
}
