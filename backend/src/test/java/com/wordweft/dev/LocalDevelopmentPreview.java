package com.wordweft.dev;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.wordweft.WordWeftApplication;
import com.wordweft.book.model.*;
import com.wordweft.book.repository.*;
import com.wordweft.community.dto.CommunityDtos.CreatePostRequest;
import com.wordweft.community.model.CommunityEnums.*;
import com.wordweft.community.model.CommunityPost;
import com.wordweft.community.repository.CommunityPostRepository;
import com.wordweft.community.service.CommunityService;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.bson.Document;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Opt-in local runtime with disposable fixtures and a loopback email inbox.
 * Kept in test sources so neither the runner nor its credentials can enter the production jar.
 * Configuration and database addresses are fixed, regardless of environment variables.
 */
public final class LocalDevelopmentPreview {
    public static final String PASSWORD = "WordWeftLocal123!";
    private static final String MONGO_URI = "mongodb://127.0.0.1:27028/wordweft_local_development";
    private static final List<Map<String, Object>> MAIL = new CopyOnWriteArrayList<>();

    private LocalDevelopmentPreview() {}

    public static void main(String[] args) throws Exception {
        HttpServer inbox = startInbox();
        ConfigurableApplicationContext context;
        try {
            SpringApplication application = new SpringApplication(WordWeftApplication.class);
            application.addInitializers(applicationContext -> applicationContext.addBeanFactoryPostProcessor(factory -> {
                // The local fixture owns seeding, including when all local stories have been deleted.
                if (factory instanceof BeanDefinitionRegistry registry && registry.containsBeanDefinition("dataSeeder")) {
                    registry.removeBeanDefinition("dataSeeder");
                }
            }));
            context = application.run(
                    "--spring.config.location=classpath:development-local.properties",
                    "--spring.profiles.active=local-development",
                    "--spring.data.mongodb.uri=" + MONGO_URI,
                    "--spring.data.mongodb.database=wordweft_local_development",
                    "--wordweft.email.apps-script-url=http://127.0.0.1:8081/send",
                    "--wordweft.app.frontendUrl=http://localhost:3000",
                    "--wordweft.app.googleClientId=local-google-disabled",
                    "--wordweft.app.jwtSecret=d29yZHdlZnQtbG9jYWwtZGV2ZWxvcG1lbnQtZGlzcG9zYWJsZS10ZXN0LWtleS1vbmx5",
                    "--wordweft.reader-sign-in-gate-enabled=true",
                    "--imagekit.public-key=", "--imagekit.private-key=",
                    "--imagekit.url-endpoint=http://127.0.0.1:9/imagekit-disabled",
                    "--wordweft.upload.signing-secret=local-only-disposable-upload-signing-secret-at-least-64-characters-long",
                    "--wordweft.upload.worker-base-url=", "--wordweft.founding-writer.sheet-url=",
                    "--server.address=127.0.0.1", "--server.port=8080");
            seed(context);
        } catch (Throwable error) {
            inbox.stop(0);
            throw error;
        }
        Runtime.getRuntime().addShutdownHook(new Thread(() -> inbox.stop(0)));
        System.out.println("Local development ready: http://127.0.0.1:8080/api/books");
        System.out.println("Local inbox: http://127.0.0.1:8081/mail (email is captured, never delivered)");
        System.out.println("Local accounts: reader@example.test, writer@example.test, admin@example.test / " + PASSWORD);
        System.out.println("Fixtures: local-story-spring / local-story-spring-chapter-1; local-story-draft; local-story-sea (scheduled chapter)");
    }

    @SuppressWarnings("unchecked")
    private static HttpServer startInbox() throws Exception {
        ObjectMapper json = new ObjectMapper();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 8081), 0);
        server.createContext("/send", exchange -> {
            if (!"POST".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(405, -1); exchange.close(); return;
            }
            Map<String, Object> message = json.readValue(exchange.getRequestBody(), Map.class);
            message.put("capturedAt", Instant.now().toString());
            MAIL.add(message);
            byte[] response = "{\"success\":true,\"localCapture\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response); exchange.close();
            System.out.println("[LOCAL EMAIL CAPTURE] " + message.get("to") + ": " + message.get("subject"));
        });
        server.createContext("/mail", exchange -> {
            byte[] response = json.writeValueAsBytes(MAIL);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Cache-Control", "no-store");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response); exchange.close();
        });
        server.start();
        return server;
    }

    private static void seed(ConfigurableApplicationContext context) {
        UserRepository users = context.getBean(UserRepository.class);
        var metadata = context.getBean(MongoTemplate.class).getCollection("local_development_metadata");
        Document fixtureKey = new Document("_id", "fixture-seed-v1");
        if (metadata.find(fixtureKey).first() != null) return;
        if (users.existsById("local-reader")
                && context.getBean(CommunityPostRepository.class).existsById("local-post-recommendation")) {
            metadata.insertOne(fixtureKey.append("seededAt", new Date()));
            return;
        }
        BookRepository books = context.getBean(BookRepository.class);
        PasswordEncoder passwords = context.getBean(PasswordEncoder.class);
        // Clean incomplete fixtures only inside this fixed local database.
        books.deleteAll(); users.deleteAll();
        User reader = account(users, passwords, "local-reader", "Ari Lane", "reader@example.test",
                "Collecting stories that make the ordinary feel a little more magical.");
        User writer = account(users, passwords, "local-writer", "Mira Ellery", "writer@example.test",
                "I write about impossible places, small acts of courage, and the things we choose to remember.");
        writer.setHasSeenWritingDemo(true);
        writer.setCommunityInterests(Set.of(CommunityInterest.WEBNOVEL_WRITING, CommunityInterest.CRITIQUE));
        writer.setCommunityBadges(Set.of(CommunityBadge.VERIFIED_CREATOR));
        User second = account(users, passwords, "local-author-2", "Theo Rowan", "theo@example.test",
                "A writer of quiet mysteries, faraway seas, and the occasional talking clock.");
        User admin = account(users, passwords, "local-admin", "Community Moderator", "admin@example.test",
                "Helping our reading and writing circles feel welcoming.");
        admin.setRoles(Set.of("ROLE_USER", "ROLE_MODERATOR", "ROLE_ADMIN"));
        admin.setCommunityBadges(Set.of(CommunityBadge.COMMUNITY_MODERATOR));
        reader.setFollowing(Set.of(writer.getId(), second.getId()));
        writer.setFollowers(Set.of(reader.getId())); second.setFollowers(Set.of(reader.getId()));
        users.saveAll(List.of(reader, writer, second, admin));

        List<Book> fixtures = List.of(
                story("spring", "The Last Spring in Bellweather", writer, "Literary Fiction", "met-53681.jpg",
                        "When a forgotten garden flowers overnight, June returns to the village she promised to leave behind.", 2),
                story("letters", "Letters from the Quiet House", second, "Mystery", "met-45294.jpg",
                        "Every Thursday, a letter arrives from a house that has stood empty for fifty years. This time, it is addressed to her.", 3),
                story("clockwork", "A Clockwork Kind of Heart", writer, "Fantasy", "search-cover-1.png",
                        "A clockmaker's apprentice finds a heartbeat inside a broken watch, and a city begins to wake from its long sleep.", 2),
                story("sea", "The Sea Remembers Our Names", writer, "Adventure", "met-55020.jpg",
                        "A cartographer and a lighthouse keeper follow a missing island through tides that carry the memories of strangers.", 2),
                story("ember", "Where the Embers Settle", second, "Romance", "search-cover-2.png",
                        "Two neighbors rebuilding an old bookshop discover that starting over can mean learning to stay.", 2),
                story("atlas", "An Atlas of Unfinished Roads", second, "Sci-Fi", "search-cover-3.png",
                        "The final train leaves Earth with one seat unclaimed and a conductor who knows exactly who belongs in it.", 3),
                story("orchard", "The Orchard at the End of October", writer, "Fantasy", "met-53681.jpg",
                        "An orchard bears fruit from lives that might have been. Nora must choose which future she can live without.", 2),
                story("mountain", "Beyond the Blue Mountain", second, "Adventure", "met-55020.jpg",
                        "Three friends retrace an expedition that vanished, carrying a map whose landmarks move with the weather.", 2),
                story("moon", "The Moon Garden", second, "Poetry", "met-45294.jpg",
                        "A collection of poems about changing seasons, shared silences, and finding a little room for wonder.", 1));
        for (Book book : fixtures) {
            if (book.getId().equals("local-story-sea")) {
                Chapter scheduled = chapter(book.getId(), 3, "The Island on the Horizon");
                scheduled.setStatus("scheduled"); scheduled.setScheduledAt(Instant.now().plus(Duration.ofDays(2)));
                book.getChapters().add(scheduled);
            } else if (book.getId().equals("local-story-spring")) {
                book.getChapters().add(chapter(book.getId(), 3, "A Door Left Open"));
            }
            books.save(book);
        }
        Book draft = story("draft", "The House Between Seasons", writer, "Fantasy", "met-45294.jpg",
                "An unfinished story about a house that never quite arrives in the present.", 0);
        draft.setPublicationStatus("draft"); draft.setPublishedDate(null);
        draft.getChapters().add(chapter(draft.getId(), 1, "An Unexpected Guest"));
        books.save(draft);
        seedLibrary(context, reader, fixtures);
        seedWritingGuide(context, draft);
        seedDiscussion(context, reader, writer, fixtures.get(0));
        metadata.insertOne(fixtureKey.append("seededAt", new Date()));
    }

    private static User account(UserRepository users, PasswordEncoder passwords, String id, String name, String email, String bio) {
        User user = new User(name, email, passwords.encode(PASSWORD));
        user.setId(id); user.setEmailVerified(true); user.setDateOfBirth(LocalDate.of(1994, 5, 12));
        user.setAvatarUrl(null); user.setBio(bio); user.setLocation("London, UK");
        user.setFavoriteGenres(List.of("Fantasy", "Literary Fiction", "Mystery"));
        user.setCommunityInterests(Set.of(CommunityInterest.READING));
        return users.save(user);
    }

    private static Book story(String slug, String title, User author, String genre, String cover, String summary, int publishedChapters) {
        Book book = new Book(); book.setId("local-story-" + slug); book.setTitle(title); book.setAuthorId(author.getId());
        // Local fixture artwork only; product uploads continue to use ImageKit.
        book.setCoverUrl("http://localhost:3000/design-v2/assets/" + cover);
        book.setSummary(summary); book.setDescription(summary + "\n\nA story for readers who enjoy thoughtful characters, richly imagined settings, and mysteries that unfold one page at a time.");
        book.setGenres(List.of(genre)); book.setCategory(genre.equals("Poetry") ? "Poetry" : "Novel");
        book.setTags(List.of("Atmospheric", "Found family", "Wonder"));
        book.setPublicationStatus("published"); book.setReadingStatus("Ongoing");
        book.setPublishedDate(LocalDate.now().minusDays(18)); book.setCreatedAt(LocalDate.now().minusDays(40)); book.setLastUpdatedAt(LocalDate.now().minusDays(1));
        book.setRating(4.8); book.setReviewsCount(1); book.setViewCount(1240); book.setReadCount(380);
        book.setReadCountLast7Days(54); book.setViewCountLast7Days(196);
        for (int index = 1; index <= publishedChapters; index++) {
            Chapter chapter = chapter(book.getId(), index, index == 1 ? "The First Light" : "What the Rain Revealed");
            chapter.setStatus("published"); chapter.setPublishedAt(Instant.now().minus(Duration.ofDays(10 - index)));
            chapter.setViewCount(120 + index * 20); book.getChapters().add(chapter);
        }
        return book;
    }

    private static Chapter chapter(String bookId, int index, String title) {
        Chapter chapter = new Chapter(); chapter.setId(bookId + "-chapter-" + index); chapter.setTitle(title);
        chapter.setContent("""
                <p>By the time June reached the village, the rain had stopped. The houses leaned toward the road as if they had been waiting for her, their windows bright with the last of the afternoon. At the end of the lane, the garden gate stood open.</p>
                <p>She had carried the key for twelve years. It lived in the small pocket of every coat she owned, a little piece of brass that had outlasted letters, promises, and the belief that leaving was the same thing as beginning.</p>
                <p>Beyond the gate, the apple tree was in flower. That was the first impossible thing. It was October, and the leaves along the lane had already begun to fall.</p>
                <p>“You came,” said a voice from the porch.</p>
                <p>June turned. A woman sat on the steps with a cup of tea between her hands. She looked familiar in the unsettling way of a face remembered from a dream: not quite someone June knew, but someone she ought to.</p>
                <p>“I received a letter,” June said.</p>
                <p>“Most people do.” The woman made room beside her. “The difficult part is deciding what to do after you read it.”</p>
                <p>The air smelled of damp earth and something sweeter. June set down her bag. For the first time since the train left the city, she noticed that her shoulders had been held tight enough to hurt.</p>
                <p>Across the garden, a bird landed in the branches and shook a small shower of petals onto the grass. Somewhere inside the house, a clock struck an hour that did not belong to the afternoon.</p>
                <p>There were questions June could have asked. How long had the woman been here? Who had watered the garden? Why did the handwriting on the letter look so much like her own? Instead, she asked if there was another cup.</p>
                <p>The woman smiled. “I thought there might be.”</p>
                <p>They sat until the light began to change. The lane grew quiet, and the village folded itself into the evening. June watched the shadows beneath the apple tree, remembering the summer she had learned that a place could be both a home and a reason to leave.</p>
                <p>When she finally opened the letter again, a new line waited beneath the words she had already read. It had not been there on the train. She was certain of that.</p>
                <p><em>There is still time to finish what you began.</em></p>
                <p>June folded the paper carefully. The gate remained open. Somewhere beyond it, the road was drying, and somewhere ahead there was a choice she could no longer pretend belonged to someone else.</p>
                """);
        chapter.updateWordCount(); return chapter;
    }

    private static void seedLibrary(ConfigurableApplicationContext context, User reader, List<Book> books) {
        Shelf shelf = new Shelf(reader.getId(), "Quiet weekend reads"); shelf.setId("local-shelf-weekend");
        context.getBean(ShelfRepository.class).save(shelf);
        for (Book book : books.subList(0, 4)) {
            LibraryEntry entry = new LibraryEntry(); entry.setId("local-library-" + book.getId());
            entry.setUserId(reader.getId()); entry.setBookId(book.getId()); entry.setAddedDate(LocalDate.now().minusDays(4));
            entry.setShelfIds(Set.of(shelf.getId())); context.getBean(LibraryRepository.class).save(entry);
        }
        ReadingProgress progress = new ReadingProgress(); progress.setId("local-progress-spring");
        progress.setUserId(reader.getId()); progress.setBookId(books.get(0).getId()); progress.setOverallProgress(31);
        ReadingProgress.ChapterProgressItem item = new ReadingProgress.ChapterProgressItem(); item.setProgress(62); item.setScrollPosition(280);
        progress.getChapters().put("local-story-spring-chapter-1", item);
        progress.setLastReadScrollPosition(280); context.getBean(ReadingProgressRepository.class).save(progress);
    }

    private static void seedWritingGuide(ConfigurableApplicationContext context, Book draft) {
        com.wordweft.book.model.Character character = new com.wordweft.book.model.Character();
        character.setId("local-character-june"); character.setBookId(draft.getId()); character.setName("June Bell");
        character.setRole("Protagonist"); character.setDescription("A returning traveler who has become very good at leaving things unfinished.");
        character.setGoal("Understand who sent the letter and decide whether this house can become home again.");
        context.getBean(CharacterRepository.class).save(character);
        Scene scene = new Scene(); scene.setId("local-scene-arrival"); scene.setBookId(draft.getId());
        scene.setTitle("The garden gate"); scene.setSetting("The village of Bellweather, after the rain"); scene.setTime("Late afternoon");
        scene.setDescription("June returns to the house and notices the impossible flowers."); scene.setCharacterIds(List.of(character.getId()));
        scene.setChapterId(draft.getChapters().get(0).getId()); context.getBean(SceneRepository.class).save(scene);
        Note note = new Note(); note.setId("local-note-motif"); note.setBookId(draft.getId()); note.setTitle("Seasonal motifs");
        note.setContent("Let the changing light mirror June's growing certainty. Keep the apple blossoms as a recurring promise of renewal.");
        context.getBean(NoteRepository.class).save(note);
    }

    private static void seedDiscussion(ConfigurableApplicationContext context, User reader, User writer, Book book) {
        Comment comment = new Comment(); comment.setId("local-paragraph-comment"); comment.setUserId(reader.getId());
        comment.setBookId(book.getId()); comment.setChapterId(book.getChapters().get(0).getId()); comment.setParagraphIndex(2);
        comment.setContent("The apple tree flowering in October is such a lovely detail. I already want to know what this garden remembers.");
        context.getBean(CommentRepository.class).save(comment);
        Review review = new Review(); review.setId("local-review-spring"); review.setBookId(book.getId()); review.setUserId(reader.getId());
        review.setRating(5); review.setDate(LocalDate.now().minusDays(2)); review.setSentiment("positive");
        review.setComment("Quietly magical, with a setting that feels alive. The opening stayed with me long after I put it down.");
        context.getBean(ReviewRepository.class).save(review);
        CommunityService service = context.getBean(CommunityService.class);
        login(writer);
        post(context, service, writer, "local-post-update", PostType.UPDATE, "general", null,
                "Some stories begin with a map. This one began with a garden flowering in October.\n\nI am revising the opening this week. What makes you stay with a first chapter?", null, List.of());
        post(context, service, writer, "local-post-poll", PostType.POLL, "general", "Where should the next story take us?",
                "Two worlds are competing for the same notebook. Which setting would you explore first?", null,
                List.of("A library beside the sea", "A city inside an ancient tree", "A train without a final station"));
        post(context, service, writer, "local-post-release", PostType.RELEASE, "new-releases", "The garden gate is open",
                "The Last Spring in Bellweather is ready for its first readers. Come meet June and tell me which small detail caught your eye.", book.getId(), List.of());
        post(context, service, writer, "local-post-workshop", PostType.WORKSHOP, "critique-corner", "Does this opening promise enough?",
                "The letter arrived twelve years after June left the village. The handwriting looked exactly like her own.\n\nI would love feedback on the hook and clarity.", null, List.of());
        login(reader); service.setCircleMembership(reader.getId(), "circle-general", true);
        service.setCircleMembership(reader.getId(), "circle-reader-recommendations", true);
        post(context, service, reader, "local-post-recommendation", PostType.RECOMMENDATION, "reader-recommendations", "For readers who love quiet magic",
                "The atmosphere drew me in, but June's uncertainty kept me reading. Give The Last Spring in Bellweather a try if you enjoy mysteries unfolding one detail at a time.", book.getId(), List.of());
        service.addComment(reader.getId(), "local-post-update", "A precise detail always gets me. The apple blossoms did it here.", null);
        service.setReaction(reader.getId(), ReactionTarget.POST, "local-post-update", ReactionType.LIKE, true);
        SecurityContextHolder.clearContext();
    }

    private static void post(ConfigurableApplicationContext context, CommunityService service, User author, String id,
                             PostType type, String circle, String title, String body, String bookId, List<String> choices) {
        CreatePostRequest request = new CreatePostRequest(); request.setType(type); request.setCircleId("circle-" + circle);
        request.setTitle(title); request.setBody(body); request.setAttachedBookId(bookId); request.setPollOptions(choices);
        CommunityPost created = service.createPost(author.getId(), request);
        CommunityPostRepository repository = context.getBean(CommunityPostRepository.class);
        repository.deleteById(created.getId()); created.setId(id); repository.save(created);
    }

    private static void login(User user) {
        UserDetailsImpl principal = UserDetailsImpl.build(user);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
