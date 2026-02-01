package com.wordweft.comment.controller;

import com.wordweft.comment.dto.CommentDto;
import com.wordweft.comment.model.Comment;
import com.wordweft.comment.service.CommentService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    // Helper to get userId from SecurityContext
    private String getUserId() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            String username;
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                username = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            } else {
                username = principal.toString();
            }

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return user.getId();
        }
        throw new RuntimeException("Unauthorized");
    }


    @PostMapping
    public ResponseEntity<CommentDto> addComment(@RequestBody CreateCommentRequest request) {
        String userId = getUserId();
        CommentDto comment = commentService.addComment(userId, request.getBookId(), request.getChapterId(),
                request.getContent(), request.getParagraphIndex());
        return ResponseEntity.ok(comment);
    }

    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<CommentDto>> getComments(@PathVariable String chapterId) {
        return ResponseEntity.ok(commentService.getCommentsByChapter(chapterId));
    }
}

@Data
class CreateCommentRequest {
    private String bookId;
    private String chapterId;
    private String content;
    private Integer paragraphIndex;
}
