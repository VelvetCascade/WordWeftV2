package com.wordweft.growth.service;

import com.wordweft.growth.dto.ReadingChallengeResponse;
import com.wordweft.growth.model.ReadingChallengeEnrollment;
import com.wordweft.growth.repository.ReadingChallengeEnrollmentRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

@Service
public class ReadingChallengeService {
    private static final List<Template> TEMPLATES = List.of(
            new Template("chapter-sprint", "Chapter Sprint", "Read ten chapters at your own pace.", "chapters", 10,
                    stats -> stats.getChaptersRead()),
            new Template("reading-hour", "The Reading Hour", "Spend sixty minutes inside a story.", "minutes", 60,
                    stats -> (int) Math.min(Integer.MAX_VALUE, stats.getTotalWordsRead() / 250)),
            new Template("story-finisher", "Story Finisher", "Complete two stories from your library.", "books", 2,
                    stats -> stats.getBooksRead())
    );

    private final UserRepository users;
    private final ReadingChallengeEnrollmentRepository enrollments;

    public ReadingChallengeService(UserRepository users, ReadingChallengeEnrollmentRepository enrollments) {
        this.users = users;
        this.enrollments = enrollments;
    }

    public List<ReadingChallengeResponse> list(String userId, Instant now) {
        User user = requireUser(userId);
        Map<String, ReadingChallengeEnrollment> joined = enrollments.findByUserId(userId).stream()
                .collect(Collectors.toMap(ReadingChallengeEnrollment::getChallengeId, item -> item, (first, ignored) -> first));
        return TEMPLATES.stream().map(template -> response(template, joined.get(template.id()), user, now)).toList();
    }

    public ReadingChallengeResponse join(String userId, String challengeId, Instant now) {
        User user = requireUser(userId);
        Template template = findTemplate(challengeId);
        ReadingChallengeEnrollment enrollment = enrollments.findByUserIdAndChallengeId(userId, challengeId)
                .orElseGet(() -> {
                    ReadingChallengeEnrollment created = new ReadingChallengeEnrollment();
                    created.setUserId(userId);
                    created.setChallengeId(challengeId);
                    created.setBaseline(template.currentValue().applyAsInt(stats(user)));
                    created.setJoinedAt(now);
                    return enrollments.save(created);
                });
        return response(template, enrollment, user, now);
    }

    private ReadingChallengeResponse response(Template template, ReadingChallengeEnrollment enrollment, User user, Instant now) {
        boolean joined = enrollment != null;
        int rawProgress = joined ? Math.max(0, template.currentValue().applyAsInt(stats(user)) - enrollment.getBaseline()) : 0;
        int progress = Math.min(template.target(), rawProgress);
        boolean completed = joined && progress >= template.target();
        return new ReadingChallengeResponse(template.id(), template.title(), template.description(), template.metric(),
                template.target(), progress, template.target() == 0 ? 0 : (progress * 100 / template.target()), joined,
                completed, joined ? enrollment.getJoinedAt() : null);
    }

    private User requireUser(String userId) {
        if (userId == null) throw new IllegalArgumentException("Sign in to view challenges");
        return users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private User.UserStats stats(User user) {
        return user.getStats() == null ? new User.UserStats() : user.getStats();
    }

    private Template findTemplate(String challengeId) {
        return TEMPLATES.stream().filter(template -> template.id().equals(challengeId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown reading challenge"));
    }

    private record Template(String id, String title, String description, String metric, int target,
                            ToIntFunction<User.UserStats> currentValue) {}
}
