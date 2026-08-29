package com.wordweft.report.repository;

import com.wordweft.report.model.Report;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface ReportRepository extends MongoRepository<Report, String> {
    boolean existsByReporterIdAndTargetTypeAndTargetIdAndCategoryAndStatus(
            String reporterId, String targetType, String targetId, String category, String status);
    long countByReporterIdAndCreatedAtAfter(String reporterId, Instant after);
    List<Report> findByReporterIdOrderByCreatedAtDesc(String reporterId);
}
