package com.wordweft.community.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.community.dto.CommunityDtos.CreatePostRequest;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.repository.*;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.book.model.Chapter;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityServiceTest {
    @Mock CommunityCircleRepository circleRepository;
    @Mock CommunityPostRepository postRepository;
    @Mock CommunityCommentRepository commentRepository;
    @Mock CircleMembershipRepository membershipRepository;
    @Mock CommunityReactionRepository reactionRepository;
    @Mock CommunityPollVoteRepository voteRepository;
    @Mock UserRepository userRepository;
    @Mock BookRepository bookRepository;
    @Mock NotificationService notificationService;
    @Mock CommunityAccess access;
    @Mock MongoTemplate mongo;
    @Mock CommunityQuota quota;

    private CommunityService service;
    private CommunityCircle general;
    private User author;

    @BeforeEach
    void setUp() {
        service = new CommunityService(new CommunityPolicy(), circleRepository, postRepository,
                commentRepository, membershipRepository, reactionRepository, voteRepository,
                userRepository, bookRepository, notificationService, access, mongo, quota);
        lenient().when(access.viewer(any())).thenAnswer(i -> new CommunityAccess.Viewer(i.getArgument(0), java.util.Set.of(), java.util.Set.of(), java.util.Set.of(), false, false, java.util.Set.of()));
        lenient().when(access.canRead(any(), any(), any(), any(), anyBoolean())).thenReturn(true);
        general = new CommunityCircle();
        general.setId("circle-1");
        general.setSlug("general");
        general.setName("General");
        general.setAllowedPostTypes(List.of(PostType.values()));
        author = new User("mira", "mira@example.com", "hash");
        author.setId("author-1");
    }

    @Test
    void createsAValidatedPostInAnActiveCircle() {
        when(userRepository.findById("author-1")).thenReturn(Optional.of(author));
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        when(postRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        CreatePostRequest request = request(PostType.UPDATE);

        CommunityPost post = service.createPost("author-1", request);

        assertEquals("author-1", post.getAuthorId());
        assertEquals("circle-1", post.getCircleId());
        assertEquals("A careful update", post.getBody());
        assertEquals(ContentStatus.ACTIVE, post.getStatus());
    }

    @Test
    void releaseMustAttachPublishedStoryOwnedByAuthor() {
        when(userRepository.findById("author-1")).thenReturn(Optional.of(author));
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        Book someoneElsesDraft = new Book();
        someoneElsesDraft.setId("book-1");
        someoneElsesDraft.setAuthorId("other-user");
        someoneElsesDraft.setPublicationStatus("draft");
        when(bookRepository.findById("book-1")).thenReturn(Optional.of(someoneElsesDraft));
        CreatePostRequest request = request(PostType.RELEASE);
        request.setTitle("A new chapter arrives");
        request.setAttachedBookId("book-1");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.createPost("author-1", request));

        assertEquals("Release posts must attach one of your published stories.", error.getMessage());
        verify(postRepository, never()).save(any());
    }

    @Test
    void recommendationsCannotPromoteAuthorsOwnStory() {
        when(userRepository.findById("author-1")).thenReturn(Optional.of(author));
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        Book ownBook = new Book();
        ownBook.setId("book-1");
        ownBook.setAuthorId("author-1");
        ownBook.setPublicationStatus("published");
        when(bookRepository.findById("book-1")).thenReturn(Optional.of(ownBook));
        CreatePostRequest request = request(PostType.RECOMMENDATION);
        request.setAttachedBookId("book-1");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service.createPost("author-1", request));

        assertEquals("Recommend another writer's published story.", error.getMessage());
    }

    @Test
    void duplicateMembershipJoinIsIdempotent() {
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        when(membershipRepository.existsByUserIdAndCircleId("reader-1", "circle-1")).thenReturn(true);

        boolean joined = service.setCircleMembership("reader-1", "circle-1", true);

        assertTrue(joined);
        verify(membershipRepository, never()).save(any());
    }

    @Test
    void preventsSelfLikesAndRemovesExistingLikes() {
        CommunityPost post = activePost("post-1", "author-1", PostType.UPDATE);
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        assertThrows(IllegalArgumentException.class,
                () -> service.setReaction("author-1", ReactionTarget.POST, "post-1", ReactionType.LIKE, true));

        CommunityReaction existing = new CommunityReaction("reader-1", ReactionTarget.POST, "post-1", ReactionType.LIKE);
        existing.setId("reaction-1");
        boolean active = service.setReaction("reader-1", ReactionTarget.POST, "post-1", ReactionType.LIKE, false);

        assertFalse(active);
        assertEquals(0, post.getLikeCount());
        verify(reactionRepository).deleteByUserIdAndTargetTypeAndTargetIdAndReactionType("reader-1", ReactionTarget.POST, "post-1", ReactionType.LIKE);
    }

    @Test
    void pollVoteIsUniqueAndAuthorsCannotVoteOnOwnPoll() {
        CommunityPost poll = activePost("poll-1", "author-1", PostType.POLL);
        poll.setPollOptions(List.of(new CommunityPost.PollOption("north", "North"), new CommunityPost.PollOption("south", "South")));
        when(postRepository.findById("poll-1")).thenReturn(Optional.of(poll));
        assertThrows(IllegalArgumentException.class, () -> service.vote("author-1", "poll-1", "north"));

        when(voteRepository.findByUserIdAndPostId("reader-1", "poll-1"))
                .thenReturn(Optional.of(new CommunityPollVote("reader-1", "poll-1", "south")));
        assertThrows(IllegalStateException.class, () -> service.vote("reader-1", "poll-1", "north"));
    }

    @Test
    void commentsRejectLockedPostsAndFlattenDeepReplies() {
        CommunityPost locked = activePost("post-1", "author-1", PostType.UPDATE);
        locked.setLocked(true);
        when(postRepository.findById("post-1")).thenReturn(Optional.of(locked));
        assertThrows(IllegalStateException.class,
                () -> service.addComment("reader-1", "post-1", "Hello", null));

        locked.setLocked(false);
        CommunityComment root = new CommunityComment();
        root.setId("root-1");
        root.setPostId("post-1");
        CommunityComment reply = new CommunityComment();
        reply.setId("reply-1");
        reply.setPostId("post-1");
        reply.setParentCommentId("root-1");
        when(commentRepository.findByIdAndStatus("reply-1", ContentStatus.ACTIVE)).thenReturn(Optional.of(reply));
        when(commentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        CommunityComment nested = service.addComment("reader-1", "post-1", "  Nested insight  ", "reply-1");

        assertEquals("root-1", nested.getParentCommentId());
        assertEquals("Nested insight", nested.getBody());
    }

    private CreatePostRequest request(PostType type) {
        CreatePostRequest request = new CreatePostRequest();
        request.setCircleId("circle-1");
        request.setType(type);
        request.setBody("  A careful update  ");
        return request;
    }

    private CommunityPost activePost(String id, String authorId, PostType type) {
        CommunityPost post = new CommunityPost();
        post.setId(id);
        post.setAuthorId(authorId);
        post.setType(type);
        post.setStatus(ContentStatus.ACTIVE);
        post.setCreatedAt(Instant.now());
        return post;
    }

    @Test void desiredLikeStateIsRetrySafeAndDoesNotRewriteThePost() {
        CommunityPost post = activePost("post-1", "author-1", PostType.UPDATE);
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        when(reactionRepository.existsByUserIdAndTargetTypeAndTargetIdAndReactionType("reader-1", ReactionTarget.POST, "post-1", ReactionType.LIKE)).thenReturn(true);
        assertTrue(service.setReaction("reader-1", ReactionTarget.POST, "post-1", ReactionType.LIKE, true));
        verify(reactionRepository, never()).insert(any(CommunityReaction.class));
        verify(postRepository, never()).save(any());
    }

    @Test void simultaneousJoinDuplicateIsTreatedAsJoined() {
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        when(membershipRepository.insert(any(CircleMembership.class))).thenThrow(new DuplicateKeyException("unique"));
        assertTrue(service.setCircleMembership("reader-1", "circle-1", true));
        verify(circleRepository, never()).save(any());
    }

    @Test void releaseCannotAdvertiseAnUnpublishedChapterEvenForItsAuthor() {
        when(userRepository.findById("author-1")).thenReturn(Optional.of(author));
        when(circleRepository.findById("circle-1")).thenReturn(Optional.of(general));
        Book book = new Book(); book.setAuthorId("author-1"); book.setPublicationStatus("published");
        Chapter chapter = new Chapter(); chapter.setId("draft-chapter"); book.setChapters(List.of(chapter));
        when(bookRepository.findById("book-1")).thenReturn(Optional.of(book));
        CreatePostRequest request = request(PostType.RELEASE); request.setTitle("Chapter launch");
        request.setAttachedBookId("book-1"); request.setAttachedChapterId("draft-chapter");
        assertThrows(IllegalArgumentException.class, () -> service.createPost("author-1", request));
        verify(postRepository, never()).save(any());
    }

    @Test void onlyOwnerCanEditAndOnlyStaffCanModerate() {
        when(postRepository.findById("post-1")).thenReturn(Optional.of(activePost("post-1", "author-1", PostType.UPDATE)));
        assertThrows(ResponseStatusException.class, () -> service.editPost("reader-1", "post-1", new EditPostRequest(null, "Changed", List.of())));
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN)).when(access).requireModerator(any());
        assertThrows(ResponseStatusException.class, () -> service.moderatePost("reader-1", "post-1", new ModerateRequest("PIN", null)));
        verifyNoInteractions(mongo);
    }

    @Test void replyingToAReplyFlattensStorageButNotifiesTheVisibleReplyAuthor() {
        CommunityPost post = activePost("post-1", "author-1", PostType.UPDATE);
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        CommunityComment reply = new CommunityComment();
        reply.setId("reply-1"); reply.setPostId("post-1"); reply.setParentCommentId("root-1"); reply.setAuthorId("reply-author");
        when(commentRepository.findByIdAndStatus("reply-1", ContentStatus.ACTIVE)).thenReturn(Optional.of(reply));
        when(commentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        User replier = new User("reader", "reader@example.com", "hash");
        when(userRepository.findById("reader-1")).thenReturn(Optional.of(replier));

        CommunityComment saved = service.addComment("reader-1", "post-1", "A nested response", "reply-1");

        assertEquals("root-1", saved.getParentCommentId());
        verify(notificationService).createNotification(eq("reply-author"), eq("reader-1"), eq("COMMUNITY_REPLY"),
                eq("COMMUNITY_POST"), eq("post-1"), anyString(), anyMap());
        verify(commentRepository).findByIdAndStatus("reply-1", ContentStatus.ACTIVE);
    }

    @Test void pollVotesHaveAnIndexForPostScopedOptionAggregation() {
        CompoundIndexes indexes = CommunityPollVote.class.getAnnotation(CompoundIndexes.class);
        assertNotNull(indexes);
        assertTrue(java.util.Arrays.stream(indexes.value()).anyMatch(index -> index.def().contains("postId") && index.def().contains("optionId")));
    }
}
