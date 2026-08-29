package com.wordweft.community.dto;

import com.wordweft.community.model.CommunityEnums.*;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.time.Instant;
import java.util.Set;

public final class CommunityDtos {
    private CommunityDtos() {}

    @Data
    public static class CreatePostRequest {
        private String circleId;
        private PostType type;
        private String title;
        private String body;
        private String attachedBookId;
        private String attachedChapterId;
        private List<String> contentWarnings = new ArrayList<>();
        private List<String> pollOptions = new ArrayList<>();
    }

    public record EditPostRequest(String title, String body, List<String> contentWarnings) {}
    public record MembershipRequest(@NotNull Boolean joined) {}
    public record ReactionRequest(@NotNull Boolean active) {}
    public record VoteRequest(@NotBlank @Size(max = 100) String optionId) {}
    public record CommentRequest(@NotBlank @Size(max = 2000) String body, @Size(max = 100) String parentCommentId) {}
    public record InterestsRequest(@NotNull @Size(max = 5) Set<@NotNull CommunityInterest> interests) {}
    public record BadgesRequest(@NotNull @Size(max = 3) Set<@NotNull CommunityBadge> badges) {}
    public record ModerateRequest(@NotBlank String action, @Size(max = 1000) String reason) {}
    public record ResolveReportRequest(@NotBlank String resolution, @NotBlank @Size(max = 1000) String reason) {}
    public record CursorPage<T>(List<T> items, String nextCursor) {}
    public record AuthorSummary(String id, String name, String avatarUrl, Set<CommunityBadge> badges, boolean following) {}
    public record CircleView(String id, String slug, String name, String description, List<String> rules,
                             String accent, List<PostType> allowedPostTypes, long memberCount, boolean official, boolean joined) {}
    public record Attachment(String bookId, String title, String coverUrl, String authorName, String chapterId,
                             String chapterTitle, Integer chapterIndex, String ageRating) {}
    public record PollOptionView(String id, String text, long voteCount) {}
    public record PostView(String id, AuthorSummary author, CircleView circle, PostType type, String title, String body,
                           Attachment attachment, List<String> contentWarnings, List<PollOptionView> pollOptions,
                           long likeCount, long commentCount, long voteCount, boolean pinned, boolean locked,
                           boolean liked, boolean saved, String votedOptionId, boolean canEdit, boolean canModerate,
                           ContentStatus status, Instant createdAt, Instant updatedAt) {}
    public record CommentView(String id, String postId, AuthorSummary author, String parentCommentId, String body,
                              long likeCount, boolean liked, boolean canEdit, boolean canModerate,
                              ContentStatus status, Instant createdAt, Instant updatedAt) {}
    public record MeView(Set<CommunityInterest> interests, Set<CommunityBadge> badges, boolean canModerate,
                         boolean canAdmin, List<String> joinedCircleIds) {}
    public record ChapterChoice(String id, String title, int index) {}
    public record AttachmentChoice(String bookId, String title, String coverUrl, String authorName, boolean owned,
                                   String ageRating, List<ChapterChoice> chapters) {}
    public record ModerationReport(String id, String ticketNumber, String targetType, String targetId, String postId,
                                   String targetTitle, String category, String description, Instant createdAt, String status) {}
}
