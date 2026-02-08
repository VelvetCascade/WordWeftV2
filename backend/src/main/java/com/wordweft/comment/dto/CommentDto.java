package com.wordweft.comment.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CommentDto {
    private String id;
    private String content;
    private String userId;
    private String userName;
    private String userAvatar;
    private String bookId;
    private String chapterId;
    private Integer paragraphIndex;
    private LocalDateTime createdAt;
}
