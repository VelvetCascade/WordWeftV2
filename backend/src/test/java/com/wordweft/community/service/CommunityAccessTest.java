package com.wordweft.community.service;

import com.wordweft.book.model.*;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CommunityAccessTest {
    final UserRepository users = mock(UserRepository.class);
    final ContentAccessService content = mock(ContentAccessService.class);
    final CommunityAccess access = new CommunityAccess(users, content);

    @Test void interestsAndBadgesNeverGrantModeratorPermissions() {
        User user = new User(); user.setId("reader");
        user.setCommunityInterests(Set.of(CommunityInterest.CRITIQUE));
        user.setCommunityBadges(Set.of(CommunityBadge.COMMUNITY_MODERATOR));
        when(users.findById("reader")).thenReturn(Optional.of(user));
        assertFalse(access.viewer("reader").canModerate());
        user.setRoles(Set.of("ROLE_MODERATOR"));
        assertTrue(access.viewer("reader").canModerate());
        assertFalse(access.viewer("reader").canAdmin());
    }

    @Test void guestsCannotReadDraftOrRestrictedAttachments() {
        when(content.allowedRatings()).thenReturn(Set.of(AgeRating.ALL_AGES, AgeRating.TEEN_13));
        var guest = access.viewer(null);
        CommunityPost post = new CommunityPost(); post.setAuthorId("author"); post.setAttachedBookId("book");
        CommunityCircle circle = new CommunityCircle();
        Book book = new Book(); book.setAuthorId("author");
        when(content.effectiveRating(book)).thenReturn(AgeRating.ALL_AGES);
        assertFalse(access.canRead(post, circle, book, guest, false));
        book.setPublicationStatus("published");
        assertTrue(access.canRead(post, circle, book, guest, false));
        when(content.effectiveRating(book)).thenReturn(AgeRating.MATURE_18);
        assertFalse(access.canRead(post, circle, book, guest, false));
    }

    @Test void chapterPublicationAndRemovedPostCannotLeakThroughDirectRead() {
        when(content.allowedRatings()).thenReturn(Set.of(AgeRating.ALL_AGES));
        CommunityPost post = new CommunityPost(); post.setAuthorId("author"); post.setAttachedBookId("book"); post.setAttachedChapterId("chapter");
        CommunityCircle circle = new CommunityCircle();
        Book book = new Book(); book.setAuthorId("author"); book.setPublicationStatus("published");
        Chapter chapter = new Chapter(); chapter.setId("chapter"); book.setChapters(List.of(chapter));
        when(content.effectiveRating(book)).thenReturn(AgeRating.ALL_AGES);
        assertFalse(access.canRead(post, circle, book, access.viewer(null), false));
        chapter.setStatus("published");
        assertTrue(access.canRead(post, circle, book, access.viewer(null), false));
        post.setStatus(ContentStatus.REMOVED);
        assertFalse(access.canRead(post, circle, book, access.viewer(null), false));
    }
}
