
package com.wordweft.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class AuthDtos {

    @Data
    public static class LoginRequest {
        @NotBlank
        private String email;

        @NotBlank
        private String password;
    }

    @Data
    public static class SignupRequest {
        @NotBlank
        @Size(min = 3, max = 20)
        private String username;

        @NotBlank
        @Size(max = 50)
        @Email
        private String email;

        @NotBlank
        @Size(min = 8, max = 40)
        private String password;
    }

    @Data
    @AllArgsConstructor
    public static class JwtResponse {
        private String token;
        private String type = "Bearer";
        private String id;
        private String username;
        private String email;
        private String avatarUrl;
        private String bio;
        private String location;
        private String website;
        private List<String> roles;
    }

    @Data
    public static class UpdateProfileRequest {
        private String name;
        private String avatarUrl;
        private String bio;
        private String location;
        private String website;
        private Map<String, String> socials;
        private List<String> favoriteGenres;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String oldPassword;
        @NotBlank
        @Size(min = 8)
        private String newPassword;
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    public static class ResetPasswordRequest {
        @NotBlank
        private String token;
        @NotBlank
        @Size(min = 8)
        private String newPassword;
    }

    @Data
    public static class VerifyOtpRequest {
        @NotBlank
        @Email
        private String email;
        @NotBlank
        @Size(min = 6, max = 6)
        private String otp;
    }

    @Data
    public static class ResendOtpRequest {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    @AllArgsConstructor
    public static class SignupResponse {
        private String message;
        private boolean requiresOtp;
        private String email;
    }

    @Data
    public static class GoogleLoginRequest {
        @NotBlank
        private String idToken;
    }

    @Data
    @AllArgsConstructor
    public static class GoogleAuthResponse {
        private String token;
        private String type;
        private String id;
        private String username;
        private String email;
        private String avatarUrl;
        private String bio;
        private String location;
        private String website;
        private List<String> roles;
        private boolean needsProfileCompletion;
    }
}
