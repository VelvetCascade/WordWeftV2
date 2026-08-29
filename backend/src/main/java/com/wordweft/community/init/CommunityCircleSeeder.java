package com.wordweft.community.init;

import com.wordweft.community.model.CommunityCircle;
import com.wordweft.community.model.CommunityEnums.PostType;
import com.wordweft.community.repository.CommunityCircleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CommunityCircleSeeder implements ApplicationRunner {
    private final CommunityCircleRepository circles;
    @Override public void run(ApplicationArguments args) {
        seed("general", "The Common Room", "Meet your next favorite writer. Share what you are reading, writing, or wondering.", "#98704F", List.of(PostType.values()),
                List.of("Be kind and discuss ideas, not people.", "Use content warnings and mark spoilers.", "Keep promotion relevant to the conversation."));
        seed("new-releases", "New Releases", "Fresh chapters, new stories, and milestones from the writers you follow.", "#AA7950", List.of(PostType.RELEASE),
                List.of("Share your own published story or chapter.", "Tell readers what makes this release special.", "Avoid duplicate announcements."));
        seed("critique-corner", "Critique Corner", "Bring a work in progress. Leave with a thoughtful new perspective.", "#718369", List.of(PostType.WORKSHOP, PostType.POLL, PostType.UPDATE),
                List.of("Ask for the kind of feedback you need.", "Be specific, constructive, and respectful.", "Only share work you have permission to post."));
        seed("writing-craft", "Writing Craft", "Talk character, structure, publishing, and the habits that help a story grow.", "#6E8191", List.of(PostType.UPDATE, PostType.POLL, PostType.WORKSHOP),
                List.of("Share useful context with your questions.", "Credit sources and respect other writing styles.", "No unsolicited services or spam."));
        seed("reader-recommendations", "Reader Recommendations", "Pass along a story that stayed with you. Help another reader find their next chapter.", "#93718C", List.of(PostType.RECOMMENDATION, PostType.POLL, PostType.UPDATE),
                List.of("Recommend another writer's published work.", "Say why you loved it without revealing the ending.", "Disclose relevant connections to the creator."));
    }
    private void seed(String slug, String name, String description, String accent, List<PostType> formats, List<String> rules) {
        // Deterministic IDs plus insert-only writes make simultaneous restarts safe, without resetting admin edits.
        String id = "circle-" + slug; if (circles.existsById(id)) return;
        CommunityCircle circle = new CommunityCircle(); circle.setId(id); circle.setSlug(slug); circle.setName(name);
        circle.setDescription(description); circle.setAccent(accent); circle.setAllowedPostTypes(formats); circle.setRules(rules); circle.setOfficial(true);
        try { circles.insert(circle); } catch (DuplicateKeyException ignored) { /* Existing circle belongs to its administrators. */ }
    }
}
