package com.wordweft.community.service;

import com.wordweft.community.model.*;
import com.wordweft.community.repository.*;
import com.wordweft.community.model.CommunityEnums.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class CommunityQueriesTest {
    final MongoTemplate mongo = mock(MongoTemplate.class);
    final CommunityAccess access = mock(CommunityAccess.class);
    final CommunityMapper mapper = mock(CommunityMapper.class);
    final CommunityService writes = mock(CommunityService.class);
    final CommunityCircleRepository circles = mock(CommunityCircleRepository.class);
    final CommunityReactionRepository reactions = mock(CommunityReactionRepository.class);
    final CommunityQueries queries = new CommunityQueries(mongo, access, mapper, writes, circles, reactions);

    @Test void followingFeedRestrictsAuthorsAndUsesTupleCursor() {
        var viewer = new CommunityAccess.Viewer("me", Set.of("author"), Set.of(), Set.of(), false, false, Set.of());
        when(access.viewer("me")).thenReturn(viewer);
        when(mongo.find(any(Query.class), eq(CommunityPost.class))).thenReturn(List.of());
        String cursor = new CommunityCursor(Instant.parse("2026-08-29T00:00:00Z"), "post-x").encode();
        queries.feed("me", "following", null, null, null, cursor, 15);
        ArgumentCaptor<Query> query = ArgumentCaptor.forClass(Query.class); verify(mongo).find(query.capture(), eq(CommunityPost.class));
        String predicate = query.getValue().getQueryObject().toString();
        assertTrue(predicate.contains("authorId")); assertTrue(predicate.contains("author"));
        assertTrue(predicate.contains("$lt")); assertTrue(predicate.contains("post-x"));
    }

    @Test void guestPersonalFeedsRequireSignInBeforeQuerying() {
        var guest = new CommunityAccess.Viewer(null, Set.of(), Set.of(), Set.of(), false, false, Set.of());
        when(access.viewer(null)).thenReturn(guest);
        doThrow(new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED)).when(access).requireMember(guest);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> queries.feed(null, "saved", null, null, null, null, 15));
        verifyNoInteractions(mongo);
    }

    @Test void restrictedPostsAreFilteredBeforeReturningItemsAndCursorUsesLastConsumedPost() {
        var guest = new CommunityAccess.Viewer(null, Set.of(), Set.of(), Set.of(), false, false, Set.of());
        when(access.viewer(null)).thenReturn(guest);
        CommunityPost hidden = post("c", "2026-08-29T03:00:00Z");
        CommunityPost visible = post("b", "2026-08-29T02:00:00Z");
        CommunityPost older = post("a", "2026-08-29T01:00:00Z");
        when(mongo.find(any(Query.class), eq(CommunityPost.class))).thenReturn(List.of(hidden, visible, older));
        CommunityCircle circle = new CommunityCircle(); circle.setId("circle");
        var source = new CommunityMapper.Sources(Map.of(), Map.of("circle", circle), Map.of());
        when(mapper.sources(anyList())).thenReturn(source);
        when(access.canRead(visible, circle, null, guest, true)).thenReturn(true);
        when(access.canRead(older, circle, null, guest, true)).thenReturn(true);
        var result = queries.feed(null, "discover", null, null, null, null, 1);
        ArgumentCaptor<List<CommunityPost>> selected = ArgumentCaptor.forClass(List.class);
        verify(mapper).posts(selected.capture(), eq(guest));
        assertEquals(List.of(visible), selected.getValue());
        assertEquals("b", CommunityCursor.parse(result.nextCursor()).id());
    }

    private CommunityPost post(String id, String date) {
        CommunityPost p = new CommunityPost(); p.setId(id); p.setCircleId("circle"); p.setAuthorId("author"); p.setType(PostType.UPDATE); p.setCreatedAt(Instant.parse(date)); return p;
    }
}
