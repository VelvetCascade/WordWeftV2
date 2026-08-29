package com.wordweft.community.service;

import com.wordweft.community.dto.CommunityDtos.*;
import com.wordweft.community.model.*;
import com.wordweft.report.model.Report;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityModerationService {
    private final CommunityAccess access;
    private final CommunityService writes;
    private final MongoTemplate mongo;

    public List<ModerationReport> reports(String actorId) {
        access.requireModerator(access.viewer(actorId));
        // A process can die after claiming a report but before finalizing it.
        // Re-open stale claims; repeated REMOVE is safe because moderation checks current status.
        mongo.updateMulti(Query.query(Criteria.where("status").is("REVIEWING").and("updatedAt").lt(Instant.now().minus(5, ChronoUnit.MINUTES))),
                new Update().set("status", "PENDING").unset("resolvedBy").unset("resolutionToken"), Report.class);
        return mongo.find(Query.query(Criteria.where("status").is("PENDING").and("targetType").in("COMMUNITY_POST", "COMMUNITY_COMMENT"))
                .with(Sort.by(Sort.Direction.ASC, "createdAt", "_id")).limit(50), Report.class).stream().map(report -> {
            String postId = report.getTargetId();
            if (report.getTargetType().equals("COMMUNITY_COMMENT")) {
                CommunityComment comment = mongo.findById(report.getTargetId(), CommunityComment.class);
                postId = comment == null ? null : comment.getPostId();
            }
            return new ModerationReport(report.getId(), report.getTicketNumber(), report.getTargetType(), report.getTargetId(), postId,
                    report.getTargetTitle(), report.getCategory(), report.getDescription(), report.getCreatedAt(), report.getStatus());
        }).toList();
    }

    public void resolve(String actorId, String reportId, ResolveReportRequest request) {
        access.requireModerator(access.viewer(actorId)); CommunityService.reasonRequired(request.reason());
        if (!List.of("DISMISS", "REMOVE").contains(request.resolution())) throw new IllegalArgumentException("Choose dismiss or remove.");
        Instant claimedAt = Instant.now();
        String token = UUID.randomUUID().toString();
        Query claim = Query.query(Criteria.where("_id").is(reportId).and("status").is("PENDING")
                .and("targetType").in("COMMUNITY_POST", "COMMUNITY_COMMENT"));
        Report report = mongo.findAndModify(claim,
                new Update().set("status", "REVIEWING").set("resolvedBy", actorId)
                        .set("resolutionToken", token).set("updatedAt", claimedAt),
                FindAndModifyOptions.options().returnNew(false), Report.class);
        if (report == null) {
            Report existing = mongo.findById(reportId, Report.class);
            if (existing == null || !List.of("COMMUNITY_POST", "COMMUNITY_COMMENT").contains(existing.getTargetType())) throw CommunityService.notFound();
            throw new IllegalStateException("This report has already been reviewed.");
        }
        Query ownedClaim = Query.query(Criteria.where("_id").is(reportId).and("status").is("REVIEWING").and("resolutionToken").is(token));
        try {
            if ("REMOVE".equals(request.resolution())) {
                ModerateRequest removal = new ModerateRequest("REMOVE", request.reason());
                if (report.getTargetType().equals("COMMUNITY_POST")) {
                    CommunityPost post = mongo.findById(report.getTargetId(), CommunityPost.class);
                    if (post != null && post.getStatus() == CommunityEnums.ContentStatus.ACTIVE) writes.moderatePost(actorId, report.getTargetId(), removal);
                } else {
                    CommunityComment comment = mongo.findById(report.getTargetId(), CommunityComment.class);
                    if (comment != null && comment.getStatus() == CommunityEnums.ContentStatus.ACTIVE) writes.moderateComment(actorId, report.getTargetId(), removal);
                }
            }
            var result = mongo.updateFirst(ownedClaim,
                    new Update().set("status", request.resolution().equals("REMOVE") ? "RESOLVED" : "DISMISSED")
                            .set("resolutionReason", request.reason().trim()).set("updatedAt", Instant.now()).unset("resolutionToken"), Report.class);
            if (result.getMatchedCount() != 1) throw new IllegalStateException("This report has already been reviewed.");
            writes.audit(actorId, "REPORT", reportId, request.resolution(), request.reason());
        } catch (RuntimeException ex) {
            // Release only this resolver's claim so a transient content-write failure can be retried safely.
            mongo.updateFirst(ownedClaim, new Update().set("status", "PENDING").unset("resolvedBy")
                    .unset("resolutionToken").set("updatedAt", Instant.now()), Report.class);
            throw ex;
        }
    }
}
