
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

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired UserRepository userRepository;
    @Autowired UserService userService;
    @Autowired PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(userService.getUserProfile(userDetails.getId()));
    }
    
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getPublicProfile(@PathVariable String id) {
        return ResponseEntity.ok(userService.getPublicProfile(id));
    }
    
    @PatchMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getName() != null) user.setUsername(request.getName());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getLocation() != null) user.setLocation(request.getLocation());
        if (request.getWebsite() != null) user.setWebsite(request.getWebsite());
        
        userRepository.save(user);
        return ResponseEntity.ok(userService.enrichUser(user));
    }
    
    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
             return ResponseEntity.badRequest().body("Error: Old password does not match.");
        }
        
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok("Password updated successfully.");
    }
}
