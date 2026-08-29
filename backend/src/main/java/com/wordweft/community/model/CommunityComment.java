package com.wordweft.community.model;

import com.wordweft.community.model.CommunityEnums.ContentStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@NoArgsConstructor
@Document(collection = "community_comments")
@CompoundIndex(name = "community_comment_cursor", def = "{'postId':1,'createdAt':1,'_id':1}")
public class CommunityComment {
    @Id private String id;
    @Indexed private String postId;
    @Indexed private String authorId;
    private String parentCommentId;
    private String body;
    private long likeCount = 0;
    @Indexed private ContentStatus status = ContentStatus.ACTIVE;
    @Indexed private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();
}
