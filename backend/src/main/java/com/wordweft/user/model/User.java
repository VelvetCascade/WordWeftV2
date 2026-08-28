
package com.wordweft.user.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Data
@NoArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String password;

    @Indexed(unique = true, sparse = true)
    private String googleId;

    private String authProvider = "LOCAL"; // LOCAL or GOOGLE

    private String avatarUrl;
    private String avatarFileId;

    private String bio;

    private String location;

    private String website;

    private LocalDate joinDate;
    private LocalDate dateOfBirth;
    private boolean allowMatureContent = false;

    // Writing Demo State
    private boolean hasSeenWritingDemo = false;

    // Email Verification
    private boolean isEmailVerified = false;
    private String emailVerificationOtp;
    private Instant emailVerificationOtpExpiry;

    // Password Reset
    private String resetPasswordToken;
    private Instant resetPasswordTokenExpiry;

    // Password History (stores last 2 hashed passwords to prevent reuse)
    private List<String> previousPasswords = new ArrayList<>();

    // For future role-based access control (Reader, Author, Admin)
    private Set<String> roles = new HashSet<>();

    // Social Graph (Storing User IDs)
    private Set<String> followers = new HashSet<>();
    private Set<String> following = new HashSet<>();

    // Extended Profile
    private Map<String, String> socials = new HashMap<>(); // twitter, instagram, threads
    private List<String> favoriteGenres = new ArrayList<>();

    // Stats
    private UserStats stats;

    // Notification Preferences (defaults all enabled)
    private Map<String, Boolean> notificationPreferences = new HashMap<>() {
        {
            put("follows", true);
            put("comments", true);
            put("storyUpdates", true);
            put("systemAnnouncements", true);
        }
    };

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.authProvider = "LOCAL";
        this.joinDate = LocalDate.now();
        this.avatarUrl = "https://ui-avatars.com/api/?name=" + username + "&background=random";
        this.stats = new UserStats();
        this.roles.add("ROLE_USER");
        this.isEmailVerified = false; // Local signups need verification
    }

    // Constructor for Google OAuth users
    public User(String username, String email, String googleId, String avatarUrl, String authProvider) {
        this.username = username;
        this.email = email;
        this.googleId = googleId;
        this.authProvider = authProvider;
        this.avatarUrl = avatarUrl != null ? avatarUrl
                : "https://ui-avatars.com/api/?name=" + username + "&background=random";
        this.joinDate = LocalDate.now();
        this.stats = new UserStats();
        this.roles.add("ROLE_USER");
        this.isEmailVerified = true; // Google emails are pre-verified
    }

    @Data
    public static class UserStats {
        private int booksRead = 0;
        private int chaptersRead = 0;
        private long totalWordsRead = 0; // New field
        private Set<String> favoriteGenres = new HashSet<>();
    }
}
