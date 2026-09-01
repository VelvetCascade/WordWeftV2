package com.wordweft.growth.service;

import com.wordweft.growth.dto.ReadingChallengeResponse;
import com.wordweft.growth.model.ReadingChallengeEnrollment;
import com.wordweft.growth.repository.ReadingChallengeEnrollmentRepository;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReadingChallengeServiceTest {
    @Mock UserRepository users;
    @Mock ReadingChallengeEnrollmentRepository enrollments;
    private ReadingChallengeService service;
    private User reader;

    @BeforeEach
    void setUp() {
        service = new ReadingChallengeService(users, enrollments);
        reader = new User();
        reader.setId("reader");
        reader.setStats(new User.UserStats());
        reader.getStats().setChaptersRead(12);
        reader.getStats().setBooksRead(3);
        reader.getStats().setTotalWordsRead(25_000);
        when(users.findById("reader")).thenReturn(Optional.of(reader));
    }

    @Test
    void progressStartsAtTheJoinBaselineAndCapsAtTheTarget() {
        ReadingChallengeEnrollment enrollment = new ReadingChallengeEnrollment();
        enrollment.setUserId("reader");
        enrollment.setChallengeId("chapter-sprint");
        enrollment.setBaseline(4);
        enrollment.setJoinedAt(Instant.parse("2026-08-20T00:00:00Z"));
        when(enrollments.findByUserId("reader")).thenReturn(List.of(enrollment));

        ReadingChallengeResponse sprint = service.list("reader", Instant.parse("2026-08-29T00:00:00Z")).stream()
                .filter(item -> item.id().equals("chapter-sprint")).findFirst().orElseThrow();

        assertEquals(8, sprint.progress());
        assertEquals(10, sprint.target());
        assertEquals(80, sprint.progressPercent());
        assertTrue(sprint.joined());

        reader.getStats().setChaptersRead(40);
        sprint = service.list("reader", Instant.parse("2026-08-29T00:00:00Z")).stream()
                .filter(item -> item.id().equals("chapter-sprint")).findFirst().orElseThrow();
        assertEquals(10, sprint.progress());
        assertEquals(100, sprint.progressPercent());
        assertTrue(sprint.completed());
    }

    @Test
    void joiningTwiceIsIdempotentAndCapturesCurrentMetric() {
        when(enrollments.findByUserIdAndChallengeId("reader", "chapter-sprint"))
                .thenReturn(Optional.empty());
        when(enrollments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service.join("reader", "chapter-sprint", Instant.parse("2026-08-29T00:00:00Z"));

        verify(enrollments).save(any());

        ReadingChallengeEnrollment existing = new ReadingChallengeEnrollment();
        existing.setChallengeId("chapter-sprint");
        when(enrollments.findByUserIdAndChallengeId("reader", "chapter-sprint"))
                .thenReturn(Optional.of(existing));
        service.join("reader", "chapter-sprint", Instant.parse("2026-08-30T00:00:00Z"));
        verify(enrollments).save(any());
    }
}
