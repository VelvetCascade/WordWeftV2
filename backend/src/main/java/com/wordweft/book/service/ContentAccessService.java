package com.wordweft.book.service;

import com.wordweft.book.model.AgeRating;
import com.wordweft.book.model.Book;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.EnumSet;
import java.util.Set;

@Service
public class ContentAccessService {
    @Autowired
    private UserRepository userRepository;

    public String currentUserId() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return principal instanceof UserDetailsImpl ? ((UserDetailsImpl) principal).getId() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    public AgeRating effectiveRating(Book book) {
        if (book.isMature() && (book.getAgeRating() == null || book.getAgeRating() == AgeRating.ALL_AGES)) return AgeRating.MATURE_18;
        if (book.getAgeRating() != null) return book.getAgeRating();
        return book.isMature() ? AgeRating.MATURE_18 : AgeRating.ALL_AGES;
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
