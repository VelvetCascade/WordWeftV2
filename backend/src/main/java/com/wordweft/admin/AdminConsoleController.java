package com.wordweft.admin;

import com.wordweft.book.model.Book;
import com.wordweft.book.model.Chapter;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import com.wordweft.report.model.Report;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Live, server-side administrative views. Never serialize User or Book documents
 * directly: they contain credentials, unpublished manuscript content and other
 * fields that must not leave the server through a management list.
 */
@RestController
@RequestMapping("/api/admin/console")
@PreAuthorize("hasRole('ADMIN')")
public class AdminConsoleController {
    private final MongoTemplate mongo;

    public AdminConsoleController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public record Overview(long users, long verifiedUsers, long newUsers7d, long authors,
                           long stories, long publishedStories, long draftStories,
                           long newStories7d, long publishedChapters, long totalReads,
                           long pendingReports, long applications, long pendingApplications,
                           List<DailyActivity> activity, Instant generatedAt) {}
    public record DailyActivity(String day, long signups, long stories) {}
    public record PageResult<T>(List<T> items, long total, int page, int size) {}
    public record UserRow(String id, String username, String email, String avatarUrl,
                          LocalDate joinedAt, boolean emailVerified, String authProvider,
                          Set<String> roles, long publishedStories) {}
    public record StoryRow(String id, String title, String authorId, String authorName,
                           String status, LocalDate createdAt, LocalDate publishedAt,
                           int chapters, int publishedChapters, int reads, int views,
                           String category, String coverUrl) {}
    public record ReportRow(String id, String ticketNumber, String targetType, String targetId,
                            String targetTitle, String category, String description, String status,
                            String reporterUsername, String reportedUsername,
                            Instant createdAt, String resolutionReason) {}
    public record ResolveRequest(
            @NotBlank @Pattern(regexp = "RESOLVED|DISMISSED") String status,
            @NotBlank @Size(min = 10, max = 1000) String reason) {}

    @GetMapping("/overview")
    public ResponseEntity<Overview> overview() {
        LocalDate today = LocalDate.now();
        LocalDate week = today.minusDays(6);
        long users = mongo.count(new Query(), User.class);
        long verified = mongo.count(Query.query(Criteria.where("emailVerified").is(true)), User.class);
        long recentUsers = mongo.count(Query.query(Criteria.where("joinDate").gte(week)), User.class);
        long stories = mongo.count(new Query(), Book.class);
        long published = mongo.count(Query.query(Criteria.where("publicationStatus").is("published")), Book.class);
        long newStories = mongo.count(Query.query(Criteria.where("createdAt").gte(week)), Book.class);
        long drafts = mongo.count(Query.query(Criteria.where("publicationStatus").is("draft")), Book.class);
        long reports = mongo.count(Query.query(Criteria.where("status").is("PENDING")), Report.class);
        long applications = mongo.getCollection("founding_writer_applications").countDocuments();
        long pendingApplications = mongo.count(Query.query(Criteria.where("status").is(FoundingWriterApplicationStatus.PENDING)),
                com.wordweft.foundingwriter.model.FoundingWriterApplication.class);
        long authors = aggregateCount(Aggregation.newAggregation(
                Aggregation.match(Criteria.where("authorId").ne(null).and("publicationStatus").is("published")),
                Aggregation.group("authorId"), Aggregation.count().as("total")), "books");
        long publishedChapters = aggregateCount(Aggregation.newAggregation(
                Aggregation.match(Criteria.where("publicationStatus").is("published")),
                Aggregation.unwind("chapters"),
                Aggregation.match(Criteria.where("chapters.status").is("published")),
                Aggregation.count().as("total")), "books");
        long reads = aggregateSumReads();

        List<DailyActivity> activity = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            activity.add(new DailyActivity(day.toString(),
                    mongo.count(Query.query(Criteria.where("joinDate").is(day)), User.class),
                    mongo.count(Query.query(Criteria.where("createdAt").is(day)), Book.class)));
        }
        return noStore(new Overview(users, verified, recentUsers, authors, stories, published,
                drafts, newStories, publishedChapters, reads, reports, applications,
                pendingApplications, activity, Instant.now()));
    }

    @GetMapping("/users")
    public ResponseEntity<PageResult<UserRow>> users(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "ALL") String role) {
        PageWindow window = window(page, size);
        Query query = new Query();
        if (!q.isBlank()) {
            Pattern match = safeSearch(q);
            query.addCriteria(new Criteria().orOperator(Criteria.where("username").regex(match),
                    Criteria.where("email").regex(match)));
        }
        if (!"ALL".equals(role)) {
            if (!Set.of("ROLE_ADMIN", "ROLE_MODERATOR", "ROLE_USER").contains(role))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role filter.");
            query.addCriteria(Criteria.where("roles").is(role));
        }
        long total = mongo.count(query, User.class);
        query.with(Sort.by(Sort.Direction.DESC, "joinDate", "_id"))
                .skip(window.skip()).limit(window.size());
        query.fields().include("_id").include("username").include("email").include("avatarUrl")
                .include("joinDate").include("isEmailVerified").include("authProvider").include("roles");
        List<User> people = mongo.find(query, User.class);
        Map<String, Long> publishedByAuthor = publishedStoryCounts(
                people.stream().map(User::getId).collect(Collectors.toSet()));
        List<UserRow> rows = people.stream().map(user -> new UserRow(user.getId(), user.getUsername(),
                user.getEmail(), user.getAvatarUrl(), user.getJoinDate(), user.isEmailVerified(),
                user.getAuthProvider(), user.getRoles() == null ? Set.of() : Set.copyOf(user.getRoles()),
                publishedByAuthor.getOrDefault(user.getId(), 0L))).toList();
        return noStore(new PageResult<>(rows, total, window.page(), window.size()));
    }

    @GetMapping("/stories")
    public ResponseEntity<PageResult<StoryRow>> stories(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "ALL") String status) {
        PageWindow window = window(page, size);
        Query query = new Query();
        if (!q.isBlank()) query.addCriteria(Criteria.where("title").regex(safeSearch(q)));
        if (!"ALL".equals(status)) {
            if (!Set.of("draft", "published").contains(status))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status filter.");
            query.addCriteria(Criteria.where("publicationStatus").is(status));
        }
        long total = mongo.count(query, Book.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt", "_id"))
                .skip(window.skip()).limit(window.size());
        // Never fetch manuscript bodies for a listing.
        query.fields().exclude("chapters.content").exclude("chapters.publishedContent")
                .exclude("description").exclude("summary").exclude("likes");
        List<Book> books = mongo.find(query, Book.class);
        Set<String> authorIds = books.stream().map(Book::getAuthorId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> authors = new HashMap<>();
        if (!authorIds.isEmpty()) {
            Query byIds = Query.query(Criteria.where("_id").in(authorIds));
            byIds.fields().include("username");
            for (User user : mongo.find(byIds, User.class)) authors.put(user.getId(), user.getUsername());
        }
        List<StoryRow> rows = books.stream().map(book -> {
            List<Chapter> chapters = book.getChapters() == null ? List.of() : book.getChapters();
            return new StoryRow(book.getId(), book.getTitle(), book.getAuthorId(),
                    authors.getOrDefault(book.getAuthorId(), "Unknown author"),
                    book.getPublicationStatus(), book.getCreatedAt(), book.getPublishedDate(),
                    chapters.size(), (int) chapters.stream().filter(c -> "published".equals(c.getStatus())).count(),
                    book.getReadCount() == null ? 0 : book.getReadCount(),
                    book.getViewCount() == null ? 0 : book.getViewCount(),
                    book.getCategory(), book.getCoverUrl());
        }).toList();
        return noStore(new PageResult<>(rows, total, window.page(), window.size()));
    }

    @GetMapping("/reports")
    public ResponseEntity<PageResult<ReportRow>> reports(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "PENDING") String status) {
        PageWindow window = window(page, size);
        if (!Set.of("ALL", "PENDING", "RESOLVED", "DISMISSED").contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report status.");
        Query query = new Query();
        if (!"ALL".equals(status)) query.addCriteria(Criteria.where("status").is(status));
        long total = mongo.count(query, Report.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt", "_id")).skip(window.skip()).limit(window.size());
        List<ReportRow> rows = mongo.find(query, Report.class).stream().map(this::reportRow).toList();
        return noStore(new PageResult<>(rows, total, window.page(), window.size()));
    }

    @PatchMapping("/reports/{id}")
    public ResponseEntity<ReportRow> resolve(@PathVariable String id,
            @Valid @RequestBody ResolveRequest request, @AuthenticationPrincipal UserDetailsImpl admin) {
        if (admin == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Query pending = Query.query(Criteria.where("_id").is(id).and("status").is("PENDING"));
        Update update = new Update().set("status", request.status())
                .set("resolutionReason", request.reason().trim()).set("resolvedBy", admin.getId())
                .set("updatedAt", Instant.now());
        Report report = mongo.findAndModify(pending, update, FindAndModifyOptions.options().returnNew(true), Report.class);
        if (report == null) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Report not found or already reviewed. Refresh the queue.");
        return noStore(reportRow(report));
    }

    private ReportRow reportRow(Report report) {
        return new ReportRow(report.getId(), report.getTicketNumber(), report.getTargetType(),
                report.getTargetId(), report.getTargetTitle(), report.getCategory(), report.getDescription(),
                report.getStatus(), report.getReporterUsername(), report.getReportedUsername(),
                report.getCreatedAt(), report.getResolutionReason());
    }

    private Map<String, Long> publishedStoryCounts(Set<String> authorIds) {
        if (authorIds.isEmpty()) return Map.of();
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("publicationStatus").is("published").and("authorId").in(authorIds)),
                Aggregation.group("authorId").count().as("total"));
        Map<String, Long> counts = new HashMap<>();
        for (Document item : mongo.aggregate(aggregation, "books", Document.class).getMappedResults()) {
            counts.put(item.getString("_id"), ((Number) item.get("total")).longValue());
        }
        return counts;
    }

    private long aggregateCount(Aggregation aggregation, String collection) {
        Document result = mongo.aggregate(aggregation, collection, Document.class).getUniqueMappedResult();
        return result == null ? 0 : ((Number) result.get("total")).longValue();
    }

    private long aggregateSumReads() {
        Document result = mongo.aggregate(Aggregation.newAggregation(
                Aggregation.group().sum("readCount").as("total")), "books", Document.class).getUniqueMappedResult();
        return result == null ? 0 : ((Number) result.get("total")).longValue();
    }

    private static Pattern safeSearch(String q) {
        String trimmed = q.strip();
        if (trimmed.length() > 80)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be 80 characters or less.");
        return Pattern.compile(Pattern.quote(trimmed), Pattern.CASE_INSENSITIVE);
    }
    private static PageWindow window(int page, int size) {
        if (page < 0 || page > 100_000 || size < 1 || size > 50)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page or size.");
        return new PageWindow(page, size);
    }
    private record PageWindow(int page, int size) {
        long skip() { return (long) page * size; }
    }
    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
