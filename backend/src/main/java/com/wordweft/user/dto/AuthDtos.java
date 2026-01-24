
package com.wordweft.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

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
        private List<String> roles;
    }
    
    @Data
    public static class UpdateProfileRequest {
        private String name; // maps to username for now or display name
        private String avatarUrl;
        private String bio;
    }
    
    @Data
    public static class ChangePasswordRequest {
        @NotBlank
        private String oldPassword;
        @NotBlank
        @Size(min = 8)
        private String newPassword;
    }
}
