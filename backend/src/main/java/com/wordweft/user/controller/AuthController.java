
package com.wordweft.user.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.wordweft.notification.service.EmailService;
import com.wordweft.security.jwt.JwtUtils;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.dto.AuthDtos.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    EmailService emailService;

    @Value("${wordweft.app.googleClientId}")
    private String googleClientId;

    private String generateOtp() {
        return String.format("%06d", new java.util.Random().nextInt(999999));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            User user = userRepository.findByUsername(userDetails.getUsername()).orElseThrow();

            if (!user.isEmailVerified() && "LOCAL".equals(user.getAuthProvider())) {
                return ResponseEntity.status(403).body("Email not verified. Please verify your email first.");
            }

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(new JwtResponse(jwt, "Bearer",
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    user.getAvatarUrl(),
                    user.getBio(),
                    user.getLocation(),
                    user.getWebsite(),
                    roles));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401).body("Incorrect email or password. Please try again.");
        } catch (org.springframework.security.authentication.InternalAuthenticationServiceException e) {
            // This is thrown when the user is not found at all
            return ResponseEntity.status(401).body("No account found with this email address.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Something went wrong. Please try again later.");
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body("This username is already taken. Please choose another one.");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body("An account with this email already exists. Try signing in instead.");
        }

        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        // Generate and set OTP
        String otp = generateOtp();
        user.setEmailVerificationOtp(otp);
        user.setEmailVerificationOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        user.setEmailVerified(false);

        userRepository.save(user);
        
        // Send OTP email instead of welcome email
        emailService.sendOtpEmail(user.getEmail(), otp);

        return ResponseEntity.ok(new SignupResponse("OTP sent to your email. Please verify.", true, user.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }
        
        if (user.isEmailVerified()) {
            return ResponseEntity.badRequest().body("Email is already verified.");
        }

        if (user.getEmailVerificationOtp() == null || !user.getEmailVerificationOtp().equals(request.getOtp())) {
            return ResponseEntity.badRequest().body("Invalid OTP. Please check the code and try again.");
        }

        if (user.getEmailVerificationOtpExpiry() == null || user.getEmailVerificationOtpExpiry().isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body("OTP has expired. Please request a new one.");
        }

        // OTP is valid
        user.setEmailVerified(true);
        user.setEmailVerificationOtp(null);
        user.setEmailVerificationOtpExpiry(null);
        userRepository.save(user);
        
        // Send welcome email now that they are verified
        emailService.sendWelcomeEmail(user.getEmail(), user.getUsername());

        // Generate JWT and log user in
        String jwt = jwtUtils.generateTokenForUser(user.getUsername());
        
        return ResponseEntity.ok(new JwtResponse(jwt, "Bearer",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getLocation(),
                user.getWebsite(),
                List.of("ROLE_USER")));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found.");
        }

        if (user.isEmailVerified()) {
            return ResponseEntity.badRequest().body("Email is already verified.");
        }

        // Throttle check: Don't allow resending within 1 minute of previous request
        if (user.getEmailVerificationOtpExpiry() != null && 
            user.getEmailVerificationOtpExpiry().minus(9, ChronoUnit.MINUTES).isAfter(Instant.now())) {
            return ResponseEntity.badRequest().body("Please wait a moment before requesting another code.");
        }

        // Generate new OTP
        String otp = generateOtp();
        user.setEmailVerificationOtp(otp);
        user.setEmailVerificationOtpExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        userRepository.save(user);

        emailService.sendOtpEmail(user.getEmail(), otp);

        return ResponseEntity.ok("A new OTP has been sent to your email.");
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@Valid @RequestBody GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getIdToken());
            if (idToken == null) {
                return ResponseEntity.badRequest().body("Error: Invalid Google token.");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            boolean needsProfileCompletion = false;

            // 1. Check if user already exists with this googleId
            Optional<User> existingByGoogleId = userRepository.findByGoogleId(googleId);
            User user;

            if (existingByGoogleId.isPresent()) {
                // Returning Google user
                user = existingByGoogleId.get();
            } else {
                // 2. Check if user exists with same email (link accounts)
                Optional<User> existingByEmail = userRepository.findByEmail(email);
                if (existingByEmail.isPresent()) {
                    user = existingByEmail.get();
                    user.setGoogleId(googleId);
                    if (user.getAvatarUrl() == null || user.getAvatarUrl().contains("ui-avatars.com")) {
                        user.setAvatarUrl(pictureUrl);
                    }
                    userRepository.save(user);
                } else {
                    // 3. Brand new user — create account
                    String baseUsername = email.split("@")[0]
                            .replaceAll("[^a-zA-Z0-9_]", "");
                    String username = baseUsername;
                    int suffix = 1;
                    while (userRepository.existsByUsername(username)) {
                        username = baseUsername + suffix;
                        suffix++;
                    }

                    user = new User(username, email, googleId, pictureUrl, "GOOGLE");
                    if (name != null && !name.trim().isEmpty()) {
                        user.setBio(""); // Will be set during profile completion
                    }
                    userRepository.save(user);
                    needsProfileCompletion = true;
                    emailService.sendWelcomeEmail(user.getEmail(), user.getUsername());
                }
            }

            // Generate JWT directly (bypassing AuthenticationManager since there's no
            // password)
            String jwt = jwtUtils.generateTokenForUser(user.getUsername());

            return ResponseEntity.ok(new GoogleAuthResponse(
                    jwt, "Bearer",
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    user.getBio(),
                    user.getLocation(),
                    user.getWebsite(),
                    List.of("ROLE_USER"),
                    needsProfileCompletion));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: Google authentication failed — " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        // In a real app, we would send an email. For this demo, we generate a token and
        // log it.
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setResetPasswordToken(token);
            user.setResetPasswordTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
            userRepository.save(user);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });

        return ResponseEntity.ok("If an account exists with that email, a password reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        User user = userRepository.findAll().stream()
                .filter(u -> request.getToken().equals(u.getResetPasswordToken()))
                .findFirst()
                .orElse(null);

        if (user == null || user.getResetPasswordTokenExpiry().isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body("Invalid or expired reset link. Please request a new one.");
        }

        // Check against current password
        if (encoder.matches(request.getNewPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body("New password cannot be the same as your current password. Please choose a different one.");
        }

        // Check against last 2 previous passwords
        if (user.getPreviousPasswords() != null) {
            for (String oldHash : user.getPreviousPasswords()) {
                if (encoder.matches(request.getNewPassword(), oldHash)) {
                    return ResponseEntity.badRequest()
                            .body("This password was used recently. Please choose a password you haven't used before.");
                }
            }
        }

        // Save current password to history before changing (keep last 2)
        if (user.getPreviousPasswords() == null) {
            user.setPreviousPasswords(new java.util.ArrayList<>());
        }
        user.getPreviousPasswords().add(user.getPassword());
        if (user.getPreviousPasswords().size() > 2) {
            user.getPreviousPasswords().remove(0);
        }

        user.setPassword(encoder.encode(request.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok("Password reset successfully. You can now login.");
    }
}
