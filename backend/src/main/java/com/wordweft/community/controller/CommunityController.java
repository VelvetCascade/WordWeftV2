package com.wordweft.community.controller;

import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.service.*;
import com.wordweft.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityQueries queries;
    private final CommunityService service;
    private final CommunityMapper mapper;
    private final CommunityAccess access;
    private final CommunityIdentityService identity;
    private final CommunityModerationService moderation;

    @GetMapping("/circles") public List<CircleView> circles() { return queries.circles(viewerId()); }
    @GetMapping("/feed") public CursorPage<PostView> feed(@RequestParam(defaultValue = "discover") String mode,
            @RequestParam(required = false) String circle, @RequestParam(required = false) String authorId,
            @RequestParam(required = false) PostType type, @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "15") int limit) { return queries.feed(viewerId(), mode, circle, authorId, type, cursor, limit); }
    @GetMapping("/posts/{id}") public PostView post(@PathVariable String id) { return queries.post(viewerId(), id); }
    @PostMapping("/posts") @ResponseStatus(HttpStatus.CREATED) public PostView create(@RequestBody CreatePostRequest request) {
        String actor = actorId(); return mapper.posts(List.of(service.createPost(actor, request)), access.viewer(actor)).get(0);
    }
    @PatchMapping("/posts/{id}") public PostView edit(@PathVariable String id, @RequestBody EditPostRequest request) {
        String actor = actorId(); service.editPost(actor, id, request); return queries.post(actor, id);
    }
    @DeleteMapping("/posts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable String id) { service.deletePost(actorId(), id); }
    @PutMapping("/circles/{id}/membership") public CircleView membership(@PathVariable String id, @Valid @RequestBody MembershipRequest request) {
        String actor = actorId(); service.setCircleMembership(actor, id, request.joined()); return queries.circle(actor, id);
    }
    @PutMapping("/posts/{id}/like") public PostView like(@PathVariable String id, @Valid @RequestBody ReactionRequest request) { return react(id, ReactionType.LIKE, request.active()); }
    @PutMapping("/posts/{id}/save") public PostView save(@PathVariable String id, @Valid @RequestBody ReactionRequest request) { return react(id, ReactionType.SAVE, request.active()); }
    private PostView react(String id, ReactionType type, boolean active) {
        String actor = actorId(); service.setReaction(actor, ReactionTarget.POST, id, type, active); return queries.post(actor, id);
    }
    @PostMapping("/posts/{id}/vote") public PostView vote(@PathVariable String id, @Valid @RequestBody VoteRequest request) {
        String actor = actorId(); service.vote(actor, id, request.optionId()); return queries.post(actor, id);
    }
    @GetMapping("/posts/{id}/comments") public CursorPage<CommentView> comments(@PathVariable String id,
            @RequestParam(required = false) String cursor, @RequestParam(defaultValue = "30") int limit) { return queries.comments(viewerId(), id, cursor, limit); }
    @PostMapping("/posts/{id}/comments") @ResponseStatus(HttpStatus.CREATED) public CommentView comment(@PathVariable String id, @Valid @RequestBody CommentRequest request) {
        String actor = actorId(); return mapper.comments(List.of(service.addComment(actor, id, request.body(), request.parentCommentId())), access.viewer(actor)).get(0);
    }
    @DeleteMapping("/comments/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteComment(@PathVariable String id) { service.deleteComment(actorId(), id); }
    @PutMapping("/comments/{id}/like") public CommentView likeComment(@PathVariable String id, @Valid @RequestBody ReactionRequest request) {
        String actor = actorId(); service.setReaction(actor, ReactionTarget.COMMENT, id, ReactionType.LIKE, request.active());
        return mapper.comments(List.of(service.activeComment(id)), access.viewer(actor)).get(0);
    }
    @PostMapping("/posts/{id}/moderate") public PostView moderatePost(@PathVariable String id, @Valid @RequestBody ModerateRequest request) {
        String actor = actorId(); return mapper.posts(List.of(service.moderatePost(actor, id, request)), access.viewer(actor)).get(0);
    }
    @PostMapping("/comments/{id}/moderate") public CommentView moderateComment(@PathVariable String id, @Valid @RequestBody ModerateRequest request) {
        String actor = actorId(); return mapper.comments(List.of(service.moderateComment(actor, id, request)), access.viewer(actor)).get(0);
    }
    @GetMapping("/me") public MeView me() { return identity.me(actorId()); }
    @PutMapping("/me/interests") public MeView interests(@Valid @RequestBody InterestsRequest request) { return identity.interests(actorId(), request.interests()); }
    @GetMapping("/attachments") public List<AttachmentChoice> attachments(@RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean owned, @RequestParam(required = false) String bookId) { return queries.attachments(actorId(), q, owned, bookId); }
    @GetMapping("/moderation/reports") public List<ModerationReport> reports() { return moderation.reports(actorId()); }
    @PostMapping("/moderation/reports/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void resolve(@PathVariable String id, @Valid @RequestBody ResolveReportRequest request) { moderation.resolve(actorId(), id, request); }
    @PutMapping("/members/{id}/badges") public AuthorSummary badges(@PathVariable String id, @Valid @RequestBody BadgesRequest request) { return identity.badges(actorId(), id, request.badges()); }

    private String viewerId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserDetailsImpl user ? user.getId() : null;
    }
    private String actorId() {
        String id = viewerId(); if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to join the conversation."); return id;
    }
}
