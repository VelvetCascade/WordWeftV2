package com.wordweft.community.service;

import com.wordweft.book.repository.BookRepository;
import com.wordweft.community.model.CommunityCircle;
import com.wordweft.community.model.CommunityEnums.PostType;
import com.wordweft.community.model.CommunityPost;
import com.wordweft.community.repository.*;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CommunityMapperTest {
    @Test void pollTotalsAreRestrictedToTheCurrentPostsSoTheCompoundIndexCanBeUsed() {
        UserRepository users = mock(UserRepository.class);
        BookRepository books = mock(BookRepository.class);
        CommunityCircleRepository circles = mock(CommunityCircleRepository.class);
        CircleMembershipRepository memberships = mock(CircleMembershipRepository.class);
        CommunityReactionRepository reactions = mock(CommunityReactionRepository.class);
        CommunityPollVoteRepository votes = mock(CommunityPollVoteRepository.class);
        CommunityCounters counters = mock(CommunityCounters.class);
        CommunityAccess access = mock(CommunityAccess.class);
        CommunityMapper mapper = new CommunityMapper(users, books, circles, memberships, reactions, votes, counters, access);
        when(counters.count(anyString(), anyString(), anyCollection(), nullable(Criteria.class))).thenReturn(Map.of());

        CommunityPost post = new CommunityPost(); post.setId("post-1"); post.setAuthorId("author-1");
        post.setCircleId("circle-1"); post.setType(PostType.POLL);
        post.setPollOptions(List.of(new CommunityPost.PollOption("option-1", "First")));
        CommunityCircle circle = new CommunityCircle(); circle.setId("circle-1"); circle.setSlug("general"); circle.setName("General");
        var source = new CommunityMapper.Sources(Map.of(), Map.of("circle-1", circle), Map.of());
        var viewer = new CommunityAccess.Viewer(null, Set.of(), Set.of(), Set.of(), false, false, Set.of());

        mapper.posts(List.of(post), viewer, source);

        verify(counters).count(eq("community_poll_votes"), eq("optionId"), eq(List.of("option-1")),
                argThat(criteria -> criteria != null && criteria.getCriteriaObject().toString().contains("postId")
                        && criteria.getCriteriaObject().toString().contains("post-1")));
    }
}
