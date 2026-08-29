package com.wordweft.community.service;

import com.wordweft.community.model.*;
import com.wordweft.report.dto.ReportRequest;
import com.wordweft.report.model.Report;
import com.wordweft.report.repository.ReportRepository;
import com.wordweft.report.service.ReportService;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.book.repository.*;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.security.services.UserDetailsImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommunityReportTest {
    @Mock ReportRepository reports;
    @Mock UserRepository users;
    @Mock BookRepository books;
    @Mock CommentRepository comments;
    @Mock NotificationService notifications;
    @Mock CommunityService communityService;
    @InjectMocks ReportService service;

    @BeforeEach void login() {
        User reporter = new User("reader", "reader@example.test", "password"); reporter.setId("reader");
        when(users.findById("reader")).thenReturn(Optional.of(reporter));
        UserDetailsImpl principal = UserDetailsImpl.build(reporter);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    @AfterEach void logout() { SecurityContextHolder.clearContext(); }

    @Test void resolvesCommunityPostToAuthorAndPreservesReporterConfidentialityInNotice() {
        User author = new User("author", "author@example.test", "password"); author.setId("author");
        when(users.findById("author")).thenReturn(Optional.of(author));
        CommunityPost post = new CommunityPost(); post.setId("post"); post.setAuthorId("author"); post.setTitle("A discussion");
        when(communityService.readablePost("reader", "post")).thenReturn(post);
        Report report = service.create(request("COMMUNITY_POST", "post"));
        assertEquals("author", report.getReportedUserId()); assertEquals("COMMUNITY_POST", report.getTargetType());
        ArgumentCaptor<Map<String, String>> meta = ArgumentCaptor.forClass(Map.class);
        verify(notifications).createNotification(eq("author"), isNull(), eq("CONTENT_REPORT_NOTICE"), eq("COMMUNITY_POST"), eq("post"), anyString(), meta.capture());
        assertFalse(meta.getValue().containsKey("reporterId")); assertEquals("post", meta.getValue().get("postId"));
    }

    @Test void resolvesCommentReportsAndRejectsInaccessibleParentPosts() {
        CommunityComment comment = new CommunityComment(); comment.setId("comment"); comment.setPostId("post"); comment.setAuthorId("author"); comment.setBody("Unkind words");
        when(communityService.activeComment("comment")).thenReturn(comment);
        when(communityService.readablePost("reader", "post")).thenThrow(CommunityService.notFound());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.create(request("COMMUNITY_COMMENT", "comment")));
        verify(reports, never()).save(any());
    }
    private ReportRequest request(String type, String id) { ReportRequest r = new ReportRequest(); r.setTargetType(type); r.setTargetId(id); r.setCategory("HARASSMENT"); return r; }
}
