package com.wordweft.community.service;

import com.wordweft.book.model.*;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.repository.*;
import com.wordweft.community.service.CommunityAccess.Viewer;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class CommunityMapper {
    private final UserRepository users;
    private final BookRepository books;
    private final CommunityCircleRepository circles;
    private final CircleMembershipRepository memberships;
    private final CommunityReactionRepository reactions;
    private final CommunityPollVoteRepository votes;
    private final CommunityCounters counters;
    private final CommunityAccess access;

    public record Sources(Map<String, User> authors, Map<String, CommunityCircle> circles, Map<String, Book> books) {}

    public Sources sources(List<CommunityPost> posts) {
        Set<String> bookIds = posts.stream().map(CommunityPost::getAttachedBookId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, Book> attached = index(books.findAllById(bookIds), Book::getId);
        Set<String> authorIds = posts.stream().map(CommunityPost::getAuthorId).collect(Collectors.toSet());
        attached.values().forEach(b -> authorIds.add(b.getAuthorId()));
        return new Sources(index(users.findAllById(authorIds), User::getId),
                index(circles.findAllById(posts.stream().map(CommunityPost::getCircleId).collect(Collectors.toSet())), CommunityCircle::getId), attached);
    }

    public List<PostView> posts(List<CommunityPost> posts, Viewer viewer) { return posts(posts, viewer, sources(posts)); }

    public List<PostView> posts(List<CommunityPost> posts, Viewer viewer, Sources source) {
        if (posts.isEmpty()) return List.of();
        List<String> ids = posts.stream().map(CommunityPost::getId).toList();
        Set<String> joined = joinedIds(viewer.id());
        Map<String, Long> members = counters.count("community_circle_memberships", "circleId", source.circles().keySet(), null);
        Map<String, Long> likes = counters.count("community_reactions", "targetId", ids, likeCriteria(ReactionTarget.POST));
        Map<String, Long> comments = counters.count("community_comments", "postId", ids, Criteria.where("status").is(ContentStatus.ACTIVE));
        List<String> options = posts.stream().flatMap(p -> p.getPollOptions().stream()).map(CommunityPost.PollOption::getId).toList();
        Map<String, Long> optionCounts = counters.count("community_poll_votes", "optionId", options, Criteria.where("postId").in(ids));
        Map<String, Set<ReactionType>> mine = viewerReactions(viewer.id(), ReactionTarget.POST, ids);
        Map<String, String> myVotes = viewer.id() == null ? Map.of() : votes.findByUserIdAndPostIdIn(viewer.id(), ids).stream()
                .collect(Collectors.toMap(CommunityPollVote::getPostId, CommunityPollVote::getOptionId));
        return posts.stream().map(post -> {
            boolean own = Objects.equals(viewer.id(), post.getAuthorId());
            boolean showResults = own || myVotes.containsKey(post.getId());
            List<PollOptionView> poll = post.getPollOptions().stream().map(option -> new PollOptionView(option.getId(), option.getText(),
                    showResults ? optionCounts.getOrDefault(option.getId(), 0L) : 0)).toList();
            Set<ReactionType> state = mine.getOrDefault(post.getId(), Set.of());
            boolean active = post.getStatus() == ContentStatus.ACTIVE;
            return new PostView(post.getId(), author(source.authors().get(post.getAuthorId()), post.getAuthorId(), viewer),
                    circle(source.circles().get(post.getCircleId()), joined, members), post.getType(), post.getTitle(),
                    post.getBody(), attachment(post, source), post.getContentWarnings(), poll,
                    likes.getOrDefault(post.getId(), 0L), comments.getOrDefault(post.getId(), 0L), poll.stream().mapToLong(PollOptionView::voteCount).sum(),
                    post.isPinned(), post.isLocked(), state.contains(ReactionType.LIKE), state.contains(ReactionType.SAVE), myVotes.get(post.getId()),
                    own && active, viewer.canModerate() && post.getStatus() != ContentStatus.DELETED, post.getStatus(), post.getCreatedAt(), post.getUpdatedAt());
        }).toList();
    }

    public List<CommentView> comments(List<CommunityComment> comments, Viewer viewer) {
        if (comments.isEmpty()) return List.of();
        List<String> ids = comments.stream().map(CommunityComment::getId).toList();
        Map<String, User> authors = index(users.findAllById(comments.stream().map(CommunityComment::getAuthorId).collect(Collectors.toSet())), User::getId);
        Map<String, Long> likes = counters.count("community_reactions", "targetId", ids, likeCriteria(ReactionTarget.COMMENT));
        Map<String, Set<ReactionType>> mine = viewerReactions(viewer.id(), ReactionTarget.COMMENT, ids);
        return comments.stream().map(c -> {
            boolean active = c.getStatus() == ContentStatus.ACTIVE;
            return new CommentView(c.getId(), c.getPostId(), author(authors.get(c.getAuthorId()), c.getAuthorId(), viewer), c.getParentCommentId(),
                    active || viewer.canModerate() && c.getStatus() == ContentStatus.REMOVED ? c.getBody() : "",
                    active ? likes.getOrDefault(c.getId(), 0L) : 0, active && mine.getOrDefault(c.getId(), Set.of()).contains(ReactionType.LIKE),
                    active && Objects.equals(viewer.id(), c.getAuthorId()), viewer.canModerate() && c.getStatus() != ContentStatus.DELETED,
                    c.getStatus(), c.getCreatedAt(), c.getUpdatedAt());
        }).toList();
    }

    public List<CircleView> circles(List<CommunityCircle> items, String viewerId) {
        Map<String, Long> counts = counters.count("community_circle_memberships", "circleId", items.stream().map(CommunityCircle::getId).toList(), null);
        Set<String> joined = joinedIds(viewerId);
        return items.stream().map(c -> circle(c, joined, counts)).toList();
    }

    public Set<String> joinedIds(String userId) {
        if (userId == null) return Set.of();
        return memberships.findByUserId(userId).stream().map(CircleMembership::getCircleId).collect(Collectors.toSet());
    }

    public AuthorSummary author(User user, String id, Viewer viewer) {
        return new AuthorSummary(id, user == null ? "Former member" : user.getUsername(), user == null ? null : user.getAvatarUrl(),
                user == null ? Set.of() : CommunityAccess.safeSet(user.getCommunityBadges()), viewer.following().contains(id));
    }

    private CircleView circle(CommunityCircle c, Set<String> joined, Map<String, Long> counts) {
        if (c == null) return new CircleView("", "general", "Unavailable circle", "", List.of(), "#8D6E63", List.of(), 0, false, false);
        return new CircleView(c.getId(), c.getSlug(), c.getName(), c.getDescription(), c.getRules(), c.getAccent(), c.getAllowedPostTypes(),
                counts.getOrDefault(c.getId(), 0L), c.isOfficial(), joined.contains(c.getId()));
    }

    private Attachment attachment(CommunityPost post, Sources source) {
        if (post.getAttachedBookId() == null) return null;
        Book book = source.books().get(post.getAttachedBookId());
        if (book == null) return null;
        String chapterTitle = null; Integer chapterIndex = null;
        if (post.getAttachedChapterId() != null && book.getChapters() != null) {
            for (int i = 0; i < book.getChapters().size(); i++) {
                Chapter chapter = book.getChapters().get(i);
                if (post.getAttachedChapterId().equals(chapter.getId())) { chapterTitle = chapter.getTitle(); chapterIndex = i; break; }
            }
        }
        User author = source.authors().get(book.getAuthorId());
        return new Attachment(book.getId(), book.getTitle(), book.getCoverUrl(), author == null ? "Former member" : author.getUsername(),
                post.getAttachedChapterId(), chapterTitle, chapterIndex, access.rating(book));
    }

    private Map<String, Set<ReactionType>> viewerReactions(String userId, ReactionTarget target, List<String> ids) {
        Map<String, Set<ReactionType>> result = new HashMap<>();
        if (userId != null) for (CommunityReaction r : reactions.findByUserIdAndTargetTypeAndTargetIdIn(userId, target, ids)) {
            result.computeIfAbsent(r.getTargetId(), k -> new HashSet<>()).add(r.getReactionType());
        }
        return result;
    }
    private Criteria likeCriteria(ReactionTarget target) { return Criteria.where("targetType").is(target).and("reactionType").is(ReactionType.LIKE); }
    public static <T> Map<String, T> index(Iterable<T> items, Function<T, String> key) {
        Map<String, T> result = new HashMap<>(); items.forEach(item -> result.put(key.apply(item), item)); return result;
    }
}
