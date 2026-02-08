
package com.wordweft.user.controller;

import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.dto.AuthDtos.*;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired UserRepository userRepository;
    @Autowired UserService userService;
    @Autowired PasswordEncoder passwordEncoder;

    private String getCurrentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getId();
        }
        return null; // For anonymous access if allowed, though security config blocks it usually
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        return ResponseEntity.ok(userService.getUserProfile(getCurrentUserId()));
    }
    
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getPublicProfile(@PathVariable String id) {
        return ResponseEntity.ok(userService.getPublicProfile(id, getCurrentUserId()));
    }
    
    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        String userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getName() != null) user.setUsername(request.getName());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getWebsite() != null) user.setWebsite(request.getWebsite());
        
        userRepository.save(user);
        return ResponseEntity.ok(userService.enrichUser(user, userId));
    }
    
    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        String userId = getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
             return ResponseEntity.badRequest().body("Error: Old password does not match.");
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok("Password updated successfully.");
    }
    
    // --- Follow Features ---
    
    @PostMapping("/{id}/follow")
    public ResponseEntity<?> followUser(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        if (currentUserId.equals(id)) return ResponseEntity.badRequest().body("Cannot follow yourself");
        
        userService.followUser(currentUserId, id);
        return ResponseEntity.ok(userService.getPublicProfile(id, currentUserId));
    }
    
    @PostMapping("/{id}/unfollow")
    public ResponseEntity<?> unfollowUser(@PathVariable String id) {
        String currentUserId = getCurrentUserId();
        userService.unfollowUser(currentUserId, id);
        return ResponseEntity.ok(userService.getPublicProfile(id, currentUserId));
    }
    
    @GetMapping("/{id}/followers")
    public ResponseEntity<?> getFollowers(@PathVariable String id) {
        List<Map<String, Object>> followers = userService.getFollowersList(id, getCurrentUserId());
        return ResponseEntity.ok(followers);
    }
    
    @GetMapping("/{id}/following")
    public ResponseEntity<?> getFollowing(@PathVariable String id) {
        List<Map<String, Object>> following = userService.getFollowingList(id, getCurrentUserId());
        return ResponseEntity.ok(following);
    }
}
