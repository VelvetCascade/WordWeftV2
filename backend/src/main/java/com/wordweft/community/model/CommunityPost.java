package com.wordweft.community.model;

import com.wordweft.community.model.CommunityEnums.ContentStatus;
import com.wordweft.community.model.CommunityEnums.PostType;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Document(collection = "community_posts")
@CompoundIndexes({
    @CompoundIndex(name = "community_feed_cursor", def = "{'status':1,'createdAt':-1,'_id':-1}"),
    @CompoundIndex(name = "community_author_cursor", def = "{'authorId':1,'status':1,'createdAt':-1,'_id':-1}"),
    @CompoundIndex(name = "community_circle_cursor", def = "{'circleId':1,'status':1,'createdAt':-1,'_id':-1}")
})
public class CommunityPost {
    @Id private String id;
    @Indexed private String authorId;
    @Indexed private String circleId;
    private PostType type;
    private String title;
    private String body;
    private String attachedBookId;
    private String attachedChapterId;
    private List<String> contentWarnings = new ArrayList<>();
    private List<PollOption> pollOptions = new ArrayList<>();
    private long likeCount = 0;
    private long commentCount = 0;
    private long voteCount = 0;
    private boolean pinned = false;
    private boolean locked = false;
    @Indexed private ContentStatus status = ContentStatus.ACTIVE;
    @Indexed private Instant createdAt = Instant.now();
    private Instant updatedAt = Instant.now();

    @Data
    @NoArgsConstructor
    public static class PollOption {
        private String id;
        private String text;
        private long voteCount;

        public PollOption(String id, String text) {
            this.id = id;
            this.text = text;
        }
    }
}
