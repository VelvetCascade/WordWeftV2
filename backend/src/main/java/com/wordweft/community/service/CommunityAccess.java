package com.wordweft.community.service;

import com.wordweft.book.model.*;
import com.wordweft.book.service.ContentAccessService;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Component
@RequiredArgsConstructor
public class CommunityAccess {
    private final UserRepository users;
    private final ContentAccessService content;

    public record Viewer(String id, Set<String> following, Set<CommunityInterest> interests,
                         Set<CommunityBadge> badges, boolean canModerate, boolean canAdmin, Set<AgeRating> ratings) {}

    public Viewer viewer(String id) {
        User user = id == null ? null : users.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
        Set<String> roles = user == null || user.getRoles() == null ? Set.of() : user.getRoles();
        return new Viewer(id, user == null ? Set.of() : safeSet(user.getFollowing()),
                user == null ? Set.of() : safeSet(user.getCommunityInterests()),
                user == null ? Set.of() : safeSet(user.getCommunityBadges()),
                roles.contains("ROLE_ADMIN") || roles.contains("ROLE_MODERATOR"), roles.contains("ROLE_ADMIN"),
                safeSet(content.allowedRatings()));
    }

    public void requireMember(Viewer viewer) {
        if (viewer.id() == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to join the conversation.");
    }

    public void requireModerator(Viewer viewer) {
        requireMember(viewer);
        if (!viewer.canModerate()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moderator access required.");
    }

    public boolean canRead(CommunityPost post, CommunityCircle circle, Book book, Viewer viewer, boolean discovery) {
        if (post.getStatus() != ContentStatus.ACTIVE || circle == null || !circle.isActive()) return false;
        if (post.getAttachedBookId() == null) return true;
        if (book == null) return false;
        boolean owner = Objects.equals(viewer.id(), book.getAuthorId()) && viewer.id() != null;
        if (!published(book) && !(owner && !discovery)) return false;
        if ((discovery || !owner) && !viewer.ratings().contains(content.effectiveRating(book))) return false;
        if (post.getAttachedChapterId() != null) {
            Chapter chapter = book.getChapters() == null ? null : book.getChapters().stream()
                    .filter(c -> post.getAttachedChapterId().equals(c.getId())).findFirst().orElse(null);
            if (chapter == null || (!"published".equalsIgnoreCase(chapter.getStatus()) && !(owner && !discovery))) return false;
        }
        return true;
    }

    public boolean canAttach(Book book, Viewer viewer) {
        return published(book) && (Objects.equals(viewer.id(), book.getAuthorId()) || viewer.ratings().contains(content.effectiveRating(book)));
    }
    public String rating(Book book) { return content.effectiveRating(book).name(); }
    public static boolean published(Book book) { return "published".equalsIgnoreCase(book.getPublicationStatus()); }
    public static <T> Set<T> safeSet(Set<T> value) { return value == null ? Set.of() : value; }
}
