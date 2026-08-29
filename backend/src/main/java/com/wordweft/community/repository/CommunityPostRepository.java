package com.wordweft.community.repository;

import com.wordweft.community.model.CommunityEnums.ContentStatus;
import com.wordweft.community.model.CommunityPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface CommunityPostRepository extends MongoRepository<CommunityPost, String> {
    Page<CommunityPost> findByStatusOrderByPinnedDescCreatedAtDesc(ContentStatus status, Pageable pageable);
    Page<CommunityPost> findByCircleIdAndStatusOrderByPinnedDescCreatedAtDesc(String circleId, ContentStatus status, Pageable pageable);
    Page<CommunityPost> findByAuthorIdAndStatusOrderByCreatedAtDesc(String authorId, ContentStatus status, Pageable pageable);
    List<CommunityPost> findByAuthorIdInAndStatusOrderByCreatedAtDesc(Collection<String> authorIds, ContentStatus status, Pageable pageable);
    List<CommunityPost> findByCircleIdInAndStatusOrderByCreatedAtDesc(Collection<String> circleIds, ContentStatus status, Pageable pageable);
    long countByAuthorIdAndCreatedAtAfter(String authorId, Instant after);
}
