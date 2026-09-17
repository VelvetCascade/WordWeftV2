package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.wordweft.book.model.Chapter;

import java.time.LocalDate;
import java.time.Period;
import java.util.EnumSet;
import java.util.Set;

@Service
public class ContentAccessService {
    public static final Set<String> MATURE_18_WARNINGS = Set.of(
            "GORE", "SEXUAL_CONTENT", "ABUSE", "SELF_HARM"
    );

    public static final Set<String> TEEN_13_WARNINGS = Set.of(
            "VIOLENCE", "STRONG_LANGUAGE", "SUBSTANCE_USE", "DISCRIMINATION"
    );

    @Autowired
    private UserRepository userRepository;

    public static AgeRating requiredRatingForWarnings(Iterable<String> warnings) {
        if (warnings == null) return AgeRating.ALL_AGES;
        AgeRating highest = AgeRating.ALL_AGES;
        for (String w : warnings) {
            if (w == null) continue;
            String normalized = w.trim().toUpperCase();
            if (MATURE_18_WARNINGS.contains(normalized)) {
                return AgeRating.MATURE_18;
            } else if (TEEN_13_WARNINGS.contains(normalized)) {
                if (highest.getMinimumAge() < AgeRating.TEEN_13.getMinimumAge()) {
                    highest = AgeRating.TEEN_13;
                }
            }
        }
        return highest;
    }

    public static AgeRating computeMinimumRatingFromChapters(Book book) {
        if (book == null || book.getChapters() == null) return AgeRating.ALL_AGES;
        AgeRating highest = AgeRating.ALL_AGES;
        for (Chapter ch : book.getChapters()) {
            if (ch == null) continue;
            AgeRating chapterRating = requiredRatingForWarnings(ch.getContentWarnings());
            if (chapterRating.getMinimumAge() > highest.getMinimumAge()) {
                highest = chapterRating;
            }
        }
        return highest;
    }

    public String currentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return principal instanceof UserDetailsImpl ? ((UserDetailsImpl) principal).getId() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    public AgeRating effectiveRating(Book book) {
        if (book == null) return AgeRating.ALL_AGES;

        AgeRating highest = book.getAgeRating() != null ? book.getAgeRating() : AgeRating.ALL_AGES;
        if (book.isMature() && highest.getMinimumAge() < AgeRating.MATURE_18.getMinimumAge()) {
            highest = AgeRating.MATURE_18;
        }

        AgeRating bookWarningRating = requiredRatingForWarnings(book.getContentWarnings());
        if (bookWarningRating.getMinimumAge() > highest.getMinimumAge()) {
            highest = bookWarningRating;
        }

        AgeRating chaptersRating = computeMinimumRatingFromChapters(book);
        if (chaptersRating.getMinimumAge() > highest.getMinimumAge()) {
            highest = chaptersRating;
        }

        return highest;
    }

    public Set<AgeRating> allowedRatings() {
        String userId = currentUserId();
        if (userId == null) return EnumSet.of(AgeRating.ALL_AGES, AgeRating.TEEN_13);

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getDateOfBirth() == null) {
            return EnumSet.of(AgeRating.ALL_AGES, AgeRating.TEEN_13);
        }

        int age = Period.between(user.getDateOfBirth(), LocalDate.now()).getYears();
        if (age < 13) return EnumSet.of(AgeRating.ALL_AGES);

        Set<AgeRating> allowed = EnumSet.of(AgeRating.ALL_AGES, AgeRating.TEEN_13);
        if (user.isAllowMatureContent() && age >= 18) allowed.add(AgeRating.MATURE_18);
        if (user.isAllowMatureContent() && age >= 21) allowed.add(AgeRating.ADULT_21);
        return allowed;
    }

    public boolean canDiscover(Book book) {
        return allowedRatings().contains(effectiveRating(book));
    }

    public boolean canAccess(Book book) {
        String userId = currentUserId();
        return (userId != null && userId.equals(book.getAuthorId())) || canDiscover(book);
    }
}
