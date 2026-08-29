package com.wordweft.community.service;

import com.wordweft.book.model.*;
import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.repository.*;
import com.wordweft.community.service.CommunityAccess.Viewer;
import com.wordweft.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CommunityQueries {
    private final MongoTemplate mongo;
    private final CommunityAccess access;
    private final CommunityMapper mapper;
    private final CommunityService writes;
    private final CommunityCircleRepository circles;
    private final CommunityReactionRepository reactions;
    private static final Sort NEWEST = Sort.by(Sort.Direction.DESC, "createdAt", "_id");

    public CursorPage<PostView> feed(String viewerId, String mode, String circleSlug, String authorId,
                                     PostType type, String cursor, int limit) {
        if (!Set.of("discover", "following", "circles", "saved").contains(mode)) throw new IllegalArgumentException("Unknown community feed.");
        int size = pageSize(limit);
        Viewer viewer = access.viewer(viewerId);
        if (!mode.equals("discover")) access.requireMember(viewer);
        Set<String> joined = mapper.joinedIds(viewerId);
        List<Criteria> filters = new ArrayList<>(); filters.add(Criteria.where("status").is(ContentStatus.ACTIVE));
        if (circleSlug != null && !circleSlug.isBlank()) filters.add(Criteria.where("circleId").is(circles.findBySlugAndActiveTrue(circleSlug)
                .orElseThrow(CommunityService::notFound).getId()));
        if (authorId != null && !authorId.isBlank()) filters.add(Criteria.where("authorId").is(authorId));
        if (type != null) filters.add(Criteria.where("type").is(type));
        switch (mode) {
            case "following" -> filters.add(Criteria.where("authorId").in(viewer.following()));
            case "circles" -> filters.add(Criteria.where("circleId").in(joined));
            case "saved" -> filters.add(Criteria.where("_id").in(reactions.findByUserIdAndTargetTypeAndReactionType(viewerId, ReactionTarget.POST, ReactionType.SAVE)
                    .stream().map(CommunityReaction::getTargetId).toList()));
        }
        CommunityCursor after = CommunityCursor.parse(cursor);
        List<CommunityPost> selected = new ArrayList<>();
        CommunityPost lastScanned = null;
        boolean more = false;
        // Bounded scans avoid leaking restricted content and avoid unbounded work on sparse feeds.
        for (int batch = 0; batch < 10; batch++) {
            List<Criteria> clauses = new ArrayList<>(filters); if (after != null) clauses.add(after.before());
            Query query = Query.query(new Criteria().andOperator(clauses.toArray(Criteria[]::new))).with(NEWEST).limit(60);
            List<CommunityPost> candidates = mongo.find(query, CommunityPost.class);
            if (candidates.isEmpty()) { more = false; break; }
            var source = mapper.sources(candidates);
            for (CommunityPost candidate : candidates) {
                lastScanned = candidate;
                if (access.canRead(candidate, source.circles().get(candidate.getCircleId()), candidate.getAttachedBookId() == null ? null : source.books().get(candidate.getAttachedBookId()), viewer, true)) {
                    selected.add(candidate);
                    if (selected.size() > size) break;
                }
            }
            if (selected.size() > size) { more = true; break; }
            more = candidates.size() == 60;
            if (!more) break;
            after = tuple(lastScanned);
        }
        if (selected.size() > size) selected.remove(selected.size() - 1);
        CommunityPost boundary = selected.size() == size ? selected.get(selected.size() - 1) : lastScanned;
        String next = more && boundary != null ? tuple(boundary).encode() : null;
        List<PostView> items = new ArrayList<>(mapper.posts(selected, viewer));
        // Rank within a chronological window; the cursor always follows source order, not mutable counts.
        if (mode.equals("discover") && (authorId == null || authorId.isBlank())) {
            Instant now = Instant.now();
            items.sort(Comparator.comparingDouble((PostView p) -> relevance(p, viewer, joined, now)).reversed()
                    .thenComparing(PostView::createdAt, Comparator.reverseOrder()).thenComparing(PostView::id, Comparator.reverseOrder()));
        }
        return new CursorPage<>(items, next);
    }

    public PostView post(String viewerId, String id) {
        Viewer viewer = access.viewer(viewerId);
        CommunityPost post = mongo.findById(id, CommunityPost.class);
        if (post == null || post.getStatus() == ContentStatus.DELETED) throw CommunityService.notFound();
        var sources = mapper.sources(List.of(post));
        // Staff can inspect a removed post for appeal/review, but this is never used for public feeds.
        if (!(viewer.canModerate() && post.getStatus() == ContentStatus.REMOVED)
                && !access.canRead(post, sources.circles().get(post.getCircleId()), post.getAttachedBookId() == null ? null : sources.books().get(post.getAttachedBookId()), viewer, false)) throw CommunityService.notFound();
        return mapper.posts(List.of(post), viewer, sources).get(0);
    }

    public CursorPage<CommentView> comments(String viewerId, String postId, String cursor, int limit) {
        int size = pageSize(limit); post(viewerId, postId);
        List<Criteria> filters = new ArrayList<>(); filters.add(Criteria.where("postId").is(postId));
        CommunityCursor after = CommunityCursor.parse(cursor); if (after != null) filters.add(after.after());
        List<CommunityComment> rows = mongo.find(Query.query(new Criteria().andOperator(filters.toArray(Criteria[]::new)))
                .with(Sort.by(Sort.Direction.ASC, "createdAt", "_id")).limit(size + 1), CommunityComment.class);
        boolean more = rows.size() > size;
        if (more) rows = new ArrayList<>(rows.subList(0, size));
        String next = more ? new CommunityCursor(rows.get(rows.size() - 1).getCreatedAt(), rows.get(rows.size() - 1).getId()).encode() : null;
        return new CursorPage<>(mapper.comments(rows, access.viewer(viewerId)), next);
    }

    public List<CircleView> circles(String userId) { return mapper.circles(circles.findByActiveTrueOrderByOfficialDescNameAsc(), userId); }
    public CircleView circle(String userId, String id) { return mapper.circles(List.of(circles.findById(id).filter(CommunityCircle::isActive).orElseThrow(CommunityService::notFound)), userId).get(0); }

    public List<AttachmentChoice> attachments(String viewerId, String search, Boolean owned, String bookId) {
        Viewer viewer = access.viewer(viewerId); access.requireMember(viewer);
        if (search != null && search.length() > 100) throw new IllegalArgumentException("Search text is too long.");
        List<Criteria> filters = new ArrayList<>(); filters.add(Criteria.where("publicationStatus").is("published"));
        if (Boolean.TRUE.equals(owned)) filters.add(Criteria.where("authorId").is(viewerId));
        if (bookId != null && !bookId.isBlank()) filters.add(Criteria.where("_id").is(bookId));
        if (search != null && !search.isBlank()) filters.add(Criteria.where("title").regex(Pattern.quote(search.trim()), "i"));
        Query query = Query.query(new Criteria().andOperator(filters.toArray(Criteria[]::new))).with(Sort.by("title", "_id")).limit(100);
        query.fields().exclude("chapters.content").exclude("description");
        List<Book> available = mongo.find(query, Book.class).stream().filter(b -> access.canAttach(b, viewer)).limit(20).toList();
        Query authorsQuery = Query.query(Criteria.where("_id").in(available.stream().map(Book::getAuthorId).toList())); authorsQuery.fields().include("username");
        Map<String, User> authors = CommunityMapper.index(mongo.find(authorsQuery, User.class), User::getId);
        return available.stream().map(book -> {
            List<ChapterChoice> chapters = new ArrayList<>();
            if (book.getChapters() != null) for (int i = 0; i < book.getChapters().size(); i++) {
                Chapter c = book.getChapters().get(i);
                if ("published".equalsIgnoreCase(c.getStatus())) chapters.add(new ChapterChoice(c.getId(), c.getTitle(), i));
            }
            User author = authors.get(book.getAuthorId());
            return new AttachmentChoice(book.getId(), book.getTitle(), book.getCoverUrl(), author == null ? "Former member" : author.getUsername(),
                    viewerId.equals(book.getAuthorId()), access.rating(book), chapters);
        }).toList();
    }

    private static int pageSize(int size) { if (size < 1 || size > 30) throw new IllegalArgumentException("Page size must be between 1 and 30."); return size; }
    private static CommunityCursor tuple(CommunityPost p) { return new CommunityCursor(p.getCreatedAt(), p.getId()); }
    private double relevance(PostView post, Viewer viewer, Set<String> joined, Instant now) {
        double hours = Math.max(0, (now.toEpochMilli() - post.createdAt().toEpochMilli()) / 3600000.0);
        double score = 24 / (hours + 6) + (post.pinned() ? 6 : 0) + (viewer.following().contains(post.author().id()) ? 2 : 0)
                + (joined.contains(post.circle().id()) ? 1 : 0) + Math.min(post.commentCount(), 5) * .15;
        if (viewer.interests().contains(CommunityInterest.READING) && post.type() == PostType.RECOMMENDATION) score += 1;
        if (viewer.interests().contains(CommunityInterest.CRITIQUE) && post.type() == PostType.WORKSHOP) score += 1;
        if (viewer.interests().contains(CommunityInterest.WRITING_CRAFT) && post.circle().slug().equals("writing-craft")) score += 1;
        if ((viewer.interests().contains(CommunityInterest.WEBNOVEL_WRITING) || viewer.interests().contains(CommunityInterest.EBOOK_PUBLISHING))
                && post.type() == PostType.RELEASE) score += .5;
        return score;
    }
}
