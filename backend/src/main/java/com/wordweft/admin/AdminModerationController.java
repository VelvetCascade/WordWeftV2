package com.wordweft.admin;

import com.wordweft.book.model.Book;
import com.wordweft.community.model.CommunityModerationEvent;
import com.wordweft.report.model.Report;
import com.wordweft.security.services.UserDetailsImpl;
import com.wordweft.user.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Human-reviewed actions only. No account/asset hard deletion. No new Mongo
 * collections: existing users, books, reports and moderation audit documents.
 */
@RestController
@RequestMapping("/api/admin/console")
@PreAuthorize("hasRole('ADMIN')")
public class AdminModerationController {
    private static final Logger log = LoggerFactory.getLogger(AdminModerationController.class);
    private final MongoTemplate mongo;
    public AdminModerationController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    public record Decision(
            @NotBlank String action,
            @NotBlank @Size(min = 10, max = 1000) String reason,
            @Size(max = 2000) String note,
            String reportId) {}
    public record ActionResult(String targetType, String targetId, String action,
                               String state, boolean auditRecorded) {}
    public record AuditItem(String actorId, String targetType, String targetId,
                            String action, String reason, Instant createdAt) {}
    public record AuditPage(List<AuditItem> items, long total, int page) {}

    @PostMapping("/users/{id}/moderation")
    public ResponseEntity<ActionResult> user(@PathVariable String id, @Valid @RequestBody Decision decision,
                                             @AuthenticationPrincipal UserDetailsImpl actor) {
        requireActor(actor);
        if (!Set.of("SUSPEND", "REINSTATE").contains(decision.action()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose SUSPEND or REINSTATE.");
        if (id.equals(actor.getId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot suspend your own account.");
        User account = mongo.findById(id, User.class);
        if (account == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found.");
        if (account.getRoles() != null && account.getRoles().contains("ROLE_ADMIN"))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin accounts cannot be suspended or reinstated here.");
        Report report = linkedReport(decision.reportId(), "USER", id);
        boolean suspend = decision.action().equals("SUSPEND");
        // Both the initial read and atomic update reject administrators, preventing
        // role-promotion races or accidentally locking out other staff accounts.
        Query precondition = suspend
                ? Query.query(Criteria.where("_id").is(id).and("roles").ne("ROLE_ADMIN").and("suspended").ne(true))
                : Query.query(Criteria.where("_id").is(id).and("roles").ne("ROLE_ADMIN").and("suspended").is(true));
        Update update = suspend
                ? new Update().set("suspended", true).set("suspensionReason", decision.reason().trim())
                    .set("suspendedBy", actor.getId()).set("suspendedAt", Instant.now())
                : new Update().set("suspended", false).unset("suspensionReason")
                    .unset("suspendedBy").unset("suspendedAt");
        User changed = mongo.findAndModify(precondition, update, FindAndModifyOptions.options().returnNew(true), User.class);
        if (changed == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account status has changed. Refresh this list.");
        boolean audited = audit(actor.getId(), "ADMIN_USER", id, decision);
        resolveLinked(report, actor, decision);
        return noStore(new ActionResult("USER", id, decision.action(),
                suspend ? "SUSPENDED" : "ACTIVE", audited));
    }

    @PostMapping("/stories/{id}/moderation")
    public ResponseEntity<ActionResult> book(@PathVariable String id, @Valid @RequestBody Decision decision,
                                             @AuthenticationPrincipal UserDetailsImpl actor) {
        requireActor(actor);
        if (!Set.of("REMOVE", "RESTORE").contains(decision.action()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose REMOVE or RESTORE.");
        Book existing = mongo.findById(id, Book.class);
        if (existing == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Story not found.");
        Report report = linkedReport(decision.reportId(), "BOOK", id);
        boolean remove = decision.action().equals("REMOVE");
        Query precondition = remove
                ? Query.query(Criteria.where("_id").is(id).and("moderationRemoved").ne(true))
                : Query.query(Criteria.where("_id").is(id).and("moderationRemoved").is(true));
        Update update = remove
                ? new Update().set("moderationRemoved", true).set("moderationBy", actor.getId())
                    .set("moderationReason", decision.reason().trim()).set("moderationAt", Instant.now())
                    .set("moderationPreviousStatus", existing.getPublicationStatus())
                : new Update().set("moderationRemoved", false).unset("moderationBy")
                    .unset("moderationReason").unset("moderationAt").unset("moderationPreviousStatus");
        Book changed = mongo.findAndModify(precondition, update, FindAndModifyOptions.options().returnNew(true), Book.class);
        if (changed == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Story status has changed. Refresh this list.");
        boolean audited = audit(actor.getId(), "ADMIN_BOOK", id, decision);
        resolveLinked(report, actor, decision);
        return noStore(new ActionResult("BOOK", id, decision.action(),
                remove ? "REMOVED" : "AVAILABLE", audited));
    }

    @GetMapping("/audit")
    public ResponseEntity<AuditPage> auditLog(@RequestParam(defaultValue = "0") int page) {
        if (page < 0 || page > 5000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page.");
        Query query = Query.query(Criteria.where("targetType").in("ADMIN_USER", "ADMIN_BOOK"));
        long total = mongo.count(query, CommunityModerationEvent.class);
        query.with(Sort.by(Sort.Direction.DESC, "createdAt", "_id")).skip(page * 30L).limit(30);
        List<AuditItem> items = mongo.find(query, CommunityModerationEvent.class).stream()
                .map(e -> new AuditItem(e.getActorId(), e.getTargetType(), e.getTargetId(),
                        e.getAction(), e.getReason(), e.getCreatedAt())).toList();
        return noStore(new AuditPage(items, total, page));
    }

    private Report linkedReport(String id, String expectedTarget, String targetId) {
        if (id == null || id.isBlank()) return null;
        Report report = mongo.findById(id, Report.class);
        if (report == null || !"PENDING".equals(report.getStatus())
                || !expectedTarget.equals(report.getTargetType()) || !targetId.equals(report.getTargetId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Report does not match this target or is no longer pending.");
        return report;
    }

    private void resolveLinked(Report report, UserDetailsImpl actor, Decision decision) {
        if (report == null) return;
        Query pending = Query.query(Criteria.where("_id").is(report.getId()).and("status").is("PENDING"));
        mongo.updateFirst(pending, new Update().set("status", "RESOLVED")
                .set("resolutionReason", decision.reason().trim()).set("resolvedBy", actor.getId())
                .set("updatedAt", Instant.now()), Report.class);
    }

    private boolean audit(String adminId, String targetType, String targetId, Decision decision) {
        try {
            CommunityModerationEvent event = new CommunityModerationEvent();
            event.setActorId(adminId); event.setTargetType(targetType); event.setTargetId(targetId);
            event.setAction(decision.action());
            event.setReason(decision.reason().trim()
                    + (decision.note() == null || decision.note().isBlank() ? ""
                    : "\nInternal staff note: " + decision.note().trim()));
            mongo.insert(event); // Reuse existing moderation history collection.
            return true;
        } catch (RuntimeException e) {
            log.error("Moderation action committed but audit history write failed for target {}", targetId, e);
            return false;
        }
    }

    private void requireActor(UserDetailsImpl actor) {
        if (actor == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    private <T> ResponseEntity<T> noStore(T payload) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(payload);
    }
}
