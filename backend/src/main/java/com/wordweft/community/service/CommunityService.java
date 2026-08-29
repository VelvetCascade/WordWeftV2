package com.wordweft.community.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.repository.*;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CommunityService {
    private final CommunityPolicy policy;
    private final CommunityCircleRepository circleRepository;
    private final CommunityPostRepository postRepository;
    private final CommunityCommentRepository commentRepository;
    private final CircleMembershipRepository membershipRepository;
    private final CommunityReactionRepository reactionRepository;
    private final CommunityPollVoteRepository voteRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final NotificationService notificationService;
    private final CommunityAccess access;
    private final MongoTemplate mongo;
    private final CommunityQuota quota;

    public CommunityPost createPost(String actorId, CreatePostRequest request) {
        access.requireMember(access.viewer(actorId));
        userRepository.findById(actorId).orElseThrow(() -> new IllegalArgumentException("Account not found."));
        if (postRepository.countByAuthorIdAndCreatedAtAfter(actorId, yesterday()) >= 12) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's community post limit.");
        }
        policy.validatePost(request);
        CommunityCircle circle = requireActiveCircle(request.getCircleId());
        if (!circle.getAllowedPostTypes().contains(request.getType())) throw new IllegalArgumentException("That post format is not available in this circle.");
        validateAttachment(actorId, request);
        quota.reserve(actorId, "POST", 12);
        CommunityPost post = new CommunityPost();
        post.setAuthorId(actorId); post.setCircleId(circle.getId()); post.setType(request.getType());
        post.setTitle(request.getTitle()); post.setBody(request.getBody());
        post.setAttachedBookId(blankToNull(request.getAttachedBookId())); post.setAttachedChapterId(blankToNull(request.getAttachedChapterId()));
        post.setContentWarnings(request.getContentWarnings());
        if (request.getType() == PostType.POLL) post.setPollOptions(request.getPollOptions().stream()
                .map(text -> new CommunityPost.PollOption(UUID.randomUUID().toString(), text)).toList());
        CommunityPost saved = postRepository.save(post);
        if (saved.getType() == PostType.RELEASE) {
            // Generic notification text cannot leak the title/body of restricted stories.
            notificationService.notifyFollowers(actorId, "COMMUNITY_RELEASE", "COMMUNITY_POST", saved.getId(),
                    "shared a new story release", Map.of("postId", saved.getId()));
        }
        return saved;
    }

    public boolean setCircleMembership(String userId, String circleId, boolean join) {
        access.requireMember(access.viewer(userId)); requireActiveCircle(circleId);
        if (join && !membershipRepository.existsByUserIdAndCircleId(userId, circleId)) {
            CircleMembership membership = new CircleMembership(userId, circleId);
            membership.setId(RelationshipId.of(userId, circleId));
            try { membershipRepository.insert(membership); } catch (DuplicateKeyException ignored) { /* idempotent retry */ }
        } else if (!join) membershipRepository.deleteByUserIdAndCircleId(userId, circleId);
        return join;
    }

    public boolean setReaction(String userId, ReactionTarget targetType, String targetId, ReactionType kind, boolean active) {
        access.requireMember(access.viewer(userId));
        if (targetType == ReactionTarget.COMMENT && kind == ReactionType.SAVE) throw new IllegalArgumentException("Only posts can be saved.");
        String ownerId;
        if (targetType == ReactionTarget.POST) ownerId = readablePost(userId, targetId).getAuthorId();
        else {
            CommunityComment comment = activeComment(targetId); readablePost(userId, comment.getPostId()); ownerId = comment.getAuthorId();
        }
        if (kind == ReactionType.LIKE && userId.equals(ownerId)) throw new IllegalArgumentException("You cannot like your own content.");
        if (active && !reactionRepository.existsByUserIdAndTargetTypeAndTargetIdAndReactionType(userId, targetType, targetId, kind)) {
            CommunityReaction reaction = new CommunityReaction(userId, targetType, targetId, kind);
            reaction.setId(RelationshipId.of(userId, targetType.name(), targetId, kind.name()));
            try { reactionRepository.insert(reaction); } catch (DuplicateKeyException ignored) { /* idempotent retry */ }
        } else if (!active) reactionRepository.deleteByUserIdAndTargetTypeAndTargetIdAndReactionType(userId, targetType, targetId, kind);
        return active;
    }

    public CommunityPost vote(String userId, String postId, String optionId) {
        access.requireMember(access.viewer(userId)); CommunityPost post = readablePost(userId, postId);
        if (post.getType() != PostType.POLL) throw new IllegalArgumentException("This post is not a poll.");
        if (post.isLocked()) throw new IllegalStateException("This discussion is locked.");
        if (post.getAuthorId().equals(userId)) throw new IllegalArgumentException("Authors cannot vote in their own polls.");
        if (post.getPollOptions().stream().noneMatch(o -> o.getId().equals(optionId))) throw new IllegalArgumentException("Poll choice not found.");
        if (voteRepository.findByUserIdAndPostId(userId, postId).isPresent()) throw new IllegalStateException("You have already voted in this poll.");
        if (voteRepository.countByUserIdAndCreatedAtAfter(userId, yesterday()) >= 30) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's poll vote limit.");
        CommunityPollVote vote = new CommunityPollVote(userId, postId, optionId); vote.setId(RelationshipId.of(userId, postId));
        quota.reserve(userId, "VOTE", 30);
        try { voteRepository.insert(vote); } catch (DuplicateKeyException ex) { throw new IllegalStateException("You have already voted in this poll."); }
        return post;
    }

    public CommunityComment addComment(String userId, String postId, String body, String parentCommentId) {
        access.requireMember(access.viewer(userId)); CommunityPost post = readablePost(userId, postId);
        if (post.isLocked()) throw new IllegalStateException("This discussion is locked.");
        if (commentRepository.countByAuthorIdAndCreatedAtAfter(userId, yesterday()) >= 60) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's community comment limit.");
        String normalized = policy.validateComment(body); CommunityComment parent = null; String rootId = null;
        if (blankToNull(parentCommentId) != null) {
            parent = activeComment(parentCommentId);
            if (!postId.equals(parent.getPostId())) throw new IllegalArgumentException("Reply does not belong to this post.");
            rootId = parent.getParentCommentId() == null ? parent.getId() : parent.getParentCommentId();
        }
        CommunityComment comment = new CommunityComment();
        quota.reserve(userId, "COMMENT", 60);
        comment.setPostId(postId); comment.setAuthorId(userId); comment.setParentCommentId(rootId); comment.setBody(normalized);
        CommunityComment saved = commentRepository.save(comment);
        String recipient = parent == null ? post.getAuthorId() : parent.getAuthorId();
        if (recipient != null && !recipient.equals(userId)) {
            Map<String, String> metadata = new HashMap<>(); metadata.put("postId", postId);
            userRepository.findById(userId).ifPresent(u -> {
                metadata.put("actorName", u.getUsername());
                if (u.getAvatarUrl() != null) metadata.put("actorAvatar", u.getAvatarUrl());
            });
            notificationService.createNotification(recipient, userId, parent == null ? "COMMUNITY_COMMENT" : "COMMUNITY_REPLY",
                    "COMMUNITY_POST", postId, parent == null ? "commented on your community post" : "replied to your community comment", metadata);
        }
        return saved;
    }

    public CommunityPost editPost(String actorId, String id, EditPostRequest request) {
        CommunityPost post = readablePost(actorId, id); requireOwner(actorId, post.getAuthorId());
        CreatePostRequest validation = new CreatePostRequest();
        validation.setType(post.getType()); validation.setCircleId(post.getCircleId());
        validation.setBody(request.body()); validation.setTitle(request.title()); validation.setContentWarnings(request.contentWarnings());
        validation.setPollOptions(post.getPollOptions().stream().map(CommunityPost.PollOption::getText).toList());
        policy.validatePost(validation);
        // A field-only update cannot accidentally undo a concurrent moderator lock or removal.
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("status").is(ContentStatus.ACTIVE)),
                new Update().set("title", validation.getTitle()).set("body", validation.getBody())
                        .set("contentWarnings", validation.getContentWarnings()).set("updatedAt", Instant.now()), CommunityPost.class);
        return postRepository.findById(id).orElseThrow(CommunityService::notFound);
    }

    public void deletePost(String actorId, String id) {
        CommunityPost post = postRepository.findById(id).orElseThrow(CommunityService::notFound); requireOwner(actorId, post.getAuthorId());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id)), new Update().set("status", ContentStatus.DELETED).set("updatedAt", Instant.now()), CommunityPost.class);
    }

    public void deleteComment(String actorId, String id) {
        CommunityComment comment = commentRepository.findById(id).orElseThrow(CommunityService::notFound); requireOwner(actorId, comment.getAuthorId());
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id)), new Update().set("status", ContentStatus.DELETED).set("updatedAt", Instant.now()), CommunityComment.class);
    }

    public CommunityPost moderatePost(String actorId, String id, ModerateRequest request) {
        access.requireModerator(access.viewer(actorId));
        CommunityPost post = postRepository.findById(id).orElseThrow(CommunityService::notFound);
        if (post.getStatus() == ContentStatus.DELETED) throw new IllegalStateException("Author-deleted content cannot be restored or moderated.");
        Update update = new Update().set("updatedAt", Instant.now());
        switch (request.action()) {
            case "PIN" -> update.set("pinned", true);
            case "UNPIN" -> update.set("pinned", false);
            case "LOCK" -> update.set("locked", true);
            case "UNLOCK" -> update.set("locked", false);
            case "REMOVE" -> { reasonRequired(request.reason()); update.set("status", ContentStatus.REMOVED); }
            case "RESTORE" -> update.set("status", ContentStatus.ACTIVE);
            default -> throw new IllegalArgumentException("Unknown moderation action.");
        }
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("status").ne(ContentStatus.DELETED)), update, CommunityPost.class);
        audit(actorId, "COMMUNITY_POST", id, request.action(), request.reason());
        return postRepository.findById(id).orElseThrow(CommunityService::notFound);
    }

    public CommunityComment moderateComment(String actorId, String id, ModerateRequest request) {
        access.requireModerator(access.viewer(actorId));
        CommunityComment comment = commentRepository.findById(id).orElseThrow(CommunityService::notFound);
        if (comment.getStatus() == ContentStatus.DELETED) throw new IllegalStateException("Author-deleted comments cannot be restored or moderated.");
        ContentStatus status = switch (request.action()) {
            case "REMOVE" -> { reasonRequired(request.reason()); yield ContentStatus.REMOVED; }
            case "RESTORE" -> ContentStatus.ACTIVE;
            default -> throw new IllegalArgumentException("Unknown comment moderation action.");
        };
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id).and("status").ne(ContentStatus.DELETED)),
                new Update().set("status", status).set("updatedAt", Instant.now()), CommunityComment.class);
        audit(actorId, "COMMUNITY_COMMENT", id, request.action(), request.reason());
        return commentRepository.findById(id).orElseThrow(CommunityService::notFound);
    }

    public CommunityPost readablePost(String userId, String id) {
        CommunityPost post = postRepository.findById(id).orElseThrow(CommunityService::notFound);
        CommunityCircle circle = post.getCircleId() == null ? null : circleRepository.findById(post.getCircleId()).orElse(null);
        Book book = post.getAttachedBookId() == null ? null : bookRepository.findById(post.getAttachedBookId()).orElse(null);
        if (!access.canRead(post, circle, book, access.viewer(userId), false)) throw notFound();
        return post;
    }
    public CommunityComment activeComment(String id) { return commentRepository.findByIdAndStatus(id, ContentStatus.ACTIVE).orElseThrow(CommunityService::notFound); }

    private CommunityCircle requireActiveCircle(String id) {
        CommunityCircle circle = circleRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Circle not found."));
        if (!circle.isActive()) throw new IllegalStateException("This circle is not currently active.");
        return circle;
    }

    private void validateAttachment(String actorId, CreatePostRequest request) {
        String bookId = blankToNull(request.getAttachedBookId());
        if (request.getType() == PostType.RELEASE && bookId == null) throw new IllegalArgumentException("Release posts must attach one of your published stories.");
        if (request.getType() == PostType.RECOMMENDATION && bookId == null) throw new IllegalArgumentException("Recommendations must attach a published story.");
        if (bookId == null) {
            if (blankToNull(request.getAttachedChapterId()) != null) throw new IllegalArgumentException("Choose a story before choosing a chapter.");
            return;
        }
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new IllegalArgumentException("Story not found."));
        boolean owner = actorId.equals(book.getAuthorId());
        if (request.getType() == PostType.RELEASE && (!owner || !CommunityAccess.published(book))) throw new IllegalArgumentException("Release posts must attach one of your published stories.");
        if (request.getType() == PostType.RECOMMENDATION && (owner || !CommunityAccess.published(book))) throw new IllegalArgumentException("Recommend another writer's published story.");
        if (!owner && !access.canAttach(book, access.viewer(actorId))) throw new IllegalArgumentException("That story is not available to attach.");
        String chapterId = blankToNull(request.getAttachedChapterId());
        if (chapterId != null) {
            Chapter chapter = book.getChapters().stream().filter(c -> chapterId.equals(c.getId())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Chapter not found in the selected story."));
            if (!"published".equalsIgnoreCase(chapter.getStatus()) && (!owner || request.getType() == PostType.RELEASE)) throw new IllegalArgumentException("That chapter is not published.");
        }
    }

    public void audit(String actorId, String targetType, String targetId, String action, String reason) {
        CommunityModerationEvent event = new CommunityModerationEvent();
        event.setActorId(actorId); event.setTargetType(targetType); event.setTargetId(targetId);
        event.setAction(action); event.setReason(blankToNull(reason)); mongo.insert(event);
    }
    private void requireOwner(String actorId, String ownerId) {
        access.requireMember(access.viewer(actorId));
        if (!Objects.equals(actorId, ownerId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can change this content.");
    }
    public static void reasonRequired(String reason) {
        if (reason == null || reason.isBlank() || reason.length() > 1000) throw new IllegalArgumentException("Give a moderation reason (1–1,000 characters).");
    }
    public static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "This community content is no longer available."); }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static Instant yesterday() { return Instant.now().minus(1, ChronoUnit.DAYS); }
}
