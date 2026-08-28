package com.wordweft.book.model;

public enum AgeRating {
    ALL_AGES(0),
    TEEN_13(13),
    MATURE_18(18),
    ADULT_21(21);

    private final int minimumAge;

    AgeRating(int minimumAge) {
        this.minimumAge = minimumAge;
    }

    public int getMinimumAge() {
        return minimumAge;
    }
}
