package com.wordweft.report.service;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.book.model.Comment;
import com.wordweft.book.repository.BookRepository;
import com.wordweft.book.repository.CommentRepository;
import com.wordweft.notification.service.NotificationService;
import com.wordweft.report.dto.ReportRequest;
import com.wordweft.report.model.Report;
import com.wordweft.report.repository.ReportRepository;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import com.wordweft.user.repository.UserRepository;
import com.wordweft.community.service.CommunityService;
import com.wordweft.community.model.CommunityPost;
import com.wordweft.community.model.CommunityComment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReportService {
    @Autowired private ReportRepository reportRepository;
    @Autowired private BookRepository bookRepository;
    @Autowired private CommentRepository commentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationService notificationService;
    @Autowired private CommunityService communityService;

    public Report create(ReportRequest request) {
        UserDetailsImpl principal = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User reporter = userRepository.findById(principal.getId()).orElseThrow();

        if (reportRepository.countByReporterIdAndCreatedAtAfter(reporter.getId(), Instant.now().minus(24, ChronoUnit.HOURS)) >= 10) {
            throw new IllegalArgumentException("You have reached the daily report limit. If someone is in immediate danger, contact local emergency services.");
        }
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetIdAndCategoryAndStatus(
                reporter.getId(), request.getTargetType(), request.getTargetId(), request.getCategory(), "PENDING")) {
            throw new IllegalArgumentException("You already have a pending report for this item and reason.");
        }

        Target target = resolveTarget(request.getTargetType(), request.getTargetId());
        if (reporter.getId().equals(target.userId)) throw new IllegalArgumentException("You cannot report your own content or account.");

        Report report = new Report();
        report.setTicketNumber("RPT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase());
        report.setReporterId(reporter.getId());
        report.setReporterUsername(reporter.getUsername());
        report.setTargetType(request.getTargetType());
        report.setTargetId(request.getTargetId());
        report.setTargetTitle(target.title);
        report.setReportedUserId(target.userId);
        report.setReportedUsername(target.username);
        report.setCategory(request.getCategory());
        report.setDescription(request.getDescription() == null ? "" : request.getDescription().trim());
        reportRepository.save(report);

        Map<String, String> metadata = new HashMap<>();
        metadata.put("ticketNumber", report.getTicketNumber());
        metadata.put("category", report.getCategory());
        metadata.put("targetTitle", report.getTargetTitle());
        if (target.postId != null) metadata.put("postId", target.postId);
        notificationService.createNotification(target.userId, null, "CONTENT_REPORT_NOTICE", request.getTargetType(), request.getTargetId(),
                "A policy report was received regarding " + target.title + ". The reporter's identity is confidential.", metadata);
        return report;
    }

    public List<Report> mine() {
        UserDetailsImpl principal = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return reportRepository.findByReporterIdOrderByCreatedAtDesc(principal.getId());
    }

    private Target resolveTarget(String type, String id) {
        return switch (type) {
            case "BOOK" -> {
                Book book = bookRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Story not found."));
                yield target(book.getAuthorId(), book.getTitle());
            }
            case "CHAPTER" -> {
                String[] parts = id.contains(":") ? id.split(":", 2) : id.split("_", 2);
                if (parts.length != 2) throw new IllegalArgumentException("Invalid chapter target.");
                Book book = bookRepository.findById(parts[0]).orElseThrow(() -> new IllegalArgumentException("Story not found."));
                Chapter chapter = book.getChapters().stream().filter(c -> c.getId().equals(parts[1])).findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Chapter not found."));
                yield target(book.getAuthorId(), book.getTitle() + " — " + chapter.getTitle());
            }
            case "COMMENT" -> {
                Comment comment = commentRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Comment not found."));
                String snippet = comment.getContent().length() > 80 ? comment.getContent().substring(0, 80) + "…" : comment.getContent();
                yield target(comment.getUserId(), "Comment: “" + snippet + "”");
            }
            case "USER" -> target(id, "Profile");
            case "COMMUNITY_POST" -> {
                UserDetailsImpl actor = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                CommunityPost post = communityService.readablePost(actor.getId(), id);
                Target owner = target(post.getAuthorId(), post.getTitle() == null ? "Community post" : post.getTitle());
                yield new Target(owner.userId, owner.username, owner.title, post.getId());
            }
            case "COMMUNITY_COMMENT" -> {
                UserDetailsImpl actor = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                CommunityComment comment = communityService.activeComment(id);
                communityService.readablePost(actor.getId(), comment.getPostId());
                Target owner = target(comment.getAuthorId(), "Community comment");
                yield new Target(owner.userId, owner.username, owner.title, comment.getPostId());
            }
            default -> throw new IllegalArgumentException("Unsupported report target.");
        };
    }

    private Target target(String userId, String title) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("Account not found."));
        return new Target(userId, user.getUsername(), "Profile".equals(title) ? "Profile: " + user.getUsername() : title, null);
    }

    private record Target(String userId, String username, String title, String postId) {}
}
