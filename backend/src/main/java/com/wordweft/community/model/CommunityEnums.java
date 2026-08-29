package com.wordweft.community.model;

public final class CommunityEnums {
    private CommunityEnums() {}

    public enum PostType { UPDATE, RELEASE, POLL, WORKSHOP, RECOMMENDATION }
    public enum ContentStatus { ACTIVE, DELETED, REMOVED }
    public enum ReactionType { LIKE, SAVE }
    public enum ReactionTarget { POST, COMMENT }
    public enum CommunityInterest { READING, WEBNOVEL_WRITING, EBOOK_PUBLISHING, WRITING_CRAFT, CRITIQUE }
    public enum CommunityBadge { VERIFIED_CREATOR, EDITORIAL_STAFF, COMMUNITY_MODERATOR }
}
