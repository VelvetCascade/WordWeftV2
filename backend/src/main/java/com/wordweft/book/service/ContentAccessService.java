package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.query.Criteria;

import com.wordweft.book.model.Chapter;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
            String normalized = w.trim().toUpperCase(Locale.ROOT);
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

        return allowedRatings(userRepository.findAccessPreferencesById(userId).orElse(null));
    }

    /** Reuses a request-local viewer preference projection, with no additional user query. */
    public Set<AgeRating> allowedRatings(User user) {
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

    /** Shared pre-pagination visibility predicate; callers capture viewer ratings once per request. */
    public static Criteria discoverableCriteria(Set<AgeRating> allowedRatings) {
        List<Criteria> filters = new ArrayList<>();
        filters.add(Criteria.where("publicationStatus").is("published"));
        filters.add(new Criteria().orOperator(
                Criteria.where("ageRating").in(allowedRatings),
                Criteria.where("ageRating").exists(false),
                Criteria.where("ageRating").is(null)));
        if (!allowedRatings.contains(AgeRating.MATURE_18)) filters.add(Criteria.where("isMature").ne(true));

        Set<String> disallowedWarnings = new TreeSet<>();
        if (!allowedRatings.contains(AgeRating.TEEN_13)) disallowedWarnings.addAll(TEEN_13_WARNINGS);
        if (!allowedRatings.contains(AgeRating.MATURE_18)) disallowedWarnings.addAll(MATURE_18_WARNINGS);
        if (!disallowedWarnings.isEmpty()) {
            // Java warning ratings use trim + case normalization; match that same legacy data here.
            List<Pattern> patterns = disallowedWarnings.stream().map(warning -> Pattern.compile(
                    "^[\\x00-\\x20]*" + warning + "[\\x00-\\x20]*$", Pattern.CASE_INSENSITIVE)).toList();
            filters.add(Criteria.where("contentWarnings").nin(patterns));
            filters.add(Criteria.where("chapters.contentWarnings").nin(patterns));
        }
        return new Criteria().andOperator(filters);
    }

    public boolean canAccess(Book book) {
        String userId = currentUserId();
        return (userId != null && userId.equals(book.getAuthorId())) || canDiscover(book);
    }

    public void validateAuthorCanPostRating(User author, AgeRating rating) {
        if (rating == null || rating.getMinimumAge() < 18) {
            return;
        }
        if (author == null || author.getDateOfBirth() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Date of birth is required in your profile before creating or publishing mature (18+/21+) content.");
        }
        int age = Period.between(author.getDateOfBirth(), LocalDate.now()).getYears();
        if (age < 18) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You must be at least 18 years old to create or publish mature (18+/21+) content.");
        }
    }
}
