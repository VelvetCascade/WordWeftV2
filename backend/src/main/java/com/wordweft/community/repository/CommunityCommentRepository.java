package com.wordweft.community.repository;

import com.wordweft.community.model.CommunityComment;
import com.wordweft.community.model.CommunityEnums.ContentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface CommunityCommentRepository extends MongoRepository<CommunityComment, String> {
    Page<CommunityComment> findByPostIdAndStatusOrderByCreatedAtAsc(String postId, ContentStatus status, Pageable pageable);
    Optional<CommunityComment> findByIdAndStatus(String id, ContentStatus status);
    long countByAuthorIdAndCreatedAtAfter(String authorId, Instant after);
}
