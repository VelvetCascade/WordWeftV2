package com.wordweft.community.dev;

import com.wordweft.WordWeftApplication;
import com.wordweft.book.model.*;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.*;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.service.*;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDate;
import java.util.*;

/** Opt-in local preview runner; compiled only into test-classes, never the production jar. */
public final class CommunityLocalPreview {
    public static void main(String[] args) {
        var context = SpringApplication.run(WordWeftApplication.class,
                "--spring.config.location=classpath:community-local.properties",
                "--spring.data.mongodb.uri=mongodb://127.0.0.1:27028/wordweft_community_verification",
                "--spring.data.mongodb.database=wordweft_community_verification", "--server.address=127.0.0.1", "--server.port=8080");
        var users = context.getBean(UserRepository.class);
        var books = context.getBean(BookRepository.class);
        var encoder = context.getBean(PasswordEncoder.class);
        var writes = context.getBean(CommunityService.class);
        if (users.findByUsername("Ari Lane").isPresent()) return;
        User reader = new User("Ari Lane", "reader@example.test", encoder.encode("CommunityTest123!"));
        reader.setId("preview-reader"); reader.setEmailVerified(true); reader.setDateOfBirth(LocalDate.of(1997, 1, 1)); reader.setAvatarUrl(null);
        reader.setCommunityInterests(Set.of(CommunityInterest.READING, CommunityInterest.CRITIQUE)); users.save(reader);
        User mod = new User("Community Moderator", "moderator@example.test", encoder.encode("CommunityTest123!"));
        mod.setId("preview-moderator"); mod.setEmailVerified(true); mod.setDateOfBirth(LocalDate.of(1990, 1, 1)); mod.setAvatarUrl(null);
        mod.setRoles(Set.of("ROLE_USER", "ROLE_MODERATOR", "ROLE_ADMIN")); mod.setCommunityBadges(Set.of(CommunityBadge.COMMUNITY_MODERATOR)); users.save(mod);
        User author = users.findByUsername("Elara Vance").orElseThrow();
        author.setEmailVerified(true); author.setPassword(encoder.encode("CommunityTest123!")); author.setDateOfBirth(LocalDate.of(1990, 1, 1));
        author.setCommunityBadges(Set.of(CommunityBadge.VERIFIED_CREATOR)); author.setFollowers(Set.of(reader.getId())); author.setAvatarUrl(null); users.save(author);
        reader.setFollowing(Set.of(author.getId())); users.save(reader);
        Book book = books.findByAuthorId(author.getId()).get(0);
        book.setCoverUrl(null); books.save(book);
        login(author);
        create(writes, author, PostType.UPDATE, "general", null,
                "Some stories begin with a map. This one began with a question: what happens when the keeper of a library cannot read?\n\nI am revising the opening this week. What makes you stay with a first chapter?", null, List.of(), List.of());
        create(writes, author, PostType.POLL, "general", "Where should the next story take us?",
                "I have two worlds on my desk and one notebook left. Help me choose the setting you would most like to explore.", null,
                List.of("A city built inside an ancient tree", "A library at the edge of the sea", "A train that never reaches its station"), List.of());
        create(writes, author, PostType.RELEASE, "new-releases", "The archives are open",
                "The Obsidian Heart is ready for its first readers. Start with The Whispering Archives and let me know which detail caught your eye.", book.getId(), List.of(), List.of());
        create(writes, author, PostType.WORKSHOP, "critique-corner", "Does this opening promise enough?",
                "The letter arrived three years after its author died. Mara knew the handwriting. What she did not recognize was the name it called her.\n\nI would love feedback on the hook and clarity, especially that final sentence.", null, List.of(), List.of());
        create(writes, author, PostType.UPDATE, "general", "A small reveal for returning readers",
                "The keeper has been leaving the letters herself. Each missing page is a memory she chose to save for someone else.", book.getId(), List.of(), List.of("SPOILERS"));
        login(reader); writes.setCircleMembership(reader.getId(), "circle-general", true);
        create(writes, reader, PostType.RECOMMENDATION, "reader-recommendations", "For readers who love impossible libraries",
                "The quiet atmosphere drew me in, but the friendship kept me reading. Give The Obsidian Heart a try if you like mysteries that unfold one detail at a time.", book.getId(), List.of(), List.of());
        SecurityContextHolder.clearContext();
        System.out.println("Isolated community preview ready. Test accounts: reader@example.test / moderator@example.test; password CommunityTest123!");
    }
    private static void create(CommunityService writes, User author, PostType type, String circle, String title,
                               String body, String bookId, List<String> choices, List<String> warnings) {
        CreatePostRequest request = new CreatePostRequest(); request.setCircleId("circle-" + circle); request.setType(type);
        request.setTitle(title); request.setBody(body); request.setAttachedBookId(bookId); request.setPollOptions(choices); request.setContentWarnings(warnings);
        writes.createPost(author.getId(), request);
    }
    private static void login(User user) {
        var principal = UserDetailsImpl.build(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
