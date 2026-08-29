package com.wordweft.community.service;

import com.wordweft.community.dto.CommunityDtos.ResolveReportRequest;
import com.wordweft.report.model.Report;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import com.mongodb.client.result.UpdateResult;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CommunityModerationServiceTest {
    @Test void queueRecoversClaimsLeftBehindByAStoppedResolver() {
        CommunityAccess access = mock(CommunityAccess.class);
        CommunityService writes = mock(CommunityService.class);
        MongoTemplate mongo = mock(MongoTemplate.class);
        CommunityModerationService service = new CommunityModerationService(access, writes, mongo);
        var viewer = new CommunityAccess.Viewer("mod", java.util.Set.of(), java.util.Set.of(), java.util.Set.of(), true, false, java.util.Set.of());
        when(access.viewer("mod")).thenReturn(viewer);
        when(mongo.find(any(Query.class), eq(Report.class))).thenReturn(java.util.List.of());

        service.reports("mod");

        verify(mongo).updateMulti(argThat(query -> query.getQueryObject().toString().contains("REVIEWING")
                        && query.getQueryObject().toString().contains("updatedAt")), any(Update.class), eq(Report.class));
    }

    @Test void atomicClaimWinnerFinalizesExactlyOnce() {
        CommunityAccess access = mock(CommunityAccess.class);
        CommunityService writes = mock(CommunityService.class);
        MongoTemplate mongo = mock(MongoTemplate.class);
        CommunityModerationService service = new CommunityModerationService(access, writes, mongo);
        var viewer = new CommunityAccess.Viewer("mod", java.util.Set.of(), java.util.Set.of(), java.util.Set.of(), true, false, java.util.Set.of());
        when(access.viewer("mod")).thenReturn(viewer);
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Report.class)))
                .thenReturn(report("report-1", "post-1", "PENDING"));
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(Report.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));

        service.resolve("mod", "report-1", new ResolveReportRequest("DISMISS", "No violation"));

        verify(writes).audit("mod", "REPORT", "report-1", "DISMISS", "No violation");
        verify(writes, never()).moderatePost(anyString(), anyString(), any());
    }

    @Test void onlyTheAtomicClaimWinnerCanResolveAndModerateAReport() {
        CommunityAccess access = mock(CommunityAccess.class);
        CommunityService writes = mock(CommunityService.class);
        MongoTemplate mongo = mock(MongoTemplate.class);
        CommunityModerationService service = new CommunityModerationService(access, writes, mongo);
        var viewer = new CommunityAccess.Viewer("mod", java.util.Set.of(), java.util.Set.of(), java.util.Set.of(), true, false, java.util.Set.of());
        when(access.viewer("mod")).thenReturn(viewer);
        // A stale read can still say PENDING after a competing moderator claimed it.
        // The atomic find-and-modify result, not this read, decides the winner.
        Report alreadyClaimed = report("report-1", "post-1", "PENDING");
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(Report.class))).thenReturn(null);
        when(mongo.findById("report-1", Report.class)).thenReturn(alreadyClaimed);

        assertThrows(IllegalStateException.class, () -> service.resolve("mod", "report-1", new ResolveReportRequest("REMOVE", "Clear violation")));

        verify(writes, never()).moderatePost(anyString(), anyString(), any());
        verify(writes, never()).audit(anyString(), anyString(), anyString(), anyString(), any());
    }

    private Report report(String id, String targetId, String status) {
        Report report = new Report(); report.setId(id); report.setTargetType("COMMUNITY_POST");
        report.setTargetId(targetId); report.setStatus(status); return report;
    }
}
