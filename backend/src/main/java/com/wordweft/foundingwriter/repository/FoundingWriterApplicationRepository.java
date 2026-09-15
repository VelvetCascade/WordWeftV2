package com.wordweft.foundingwriter.repository;

import com.wordweft.foundingwriter.model.FoundingWriterApplication;
import com.wordweft.foundingwriter.model.FoundingWriterApplicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoundingWriterApplicationRepository extends MongoRepository<FoundingWriterApplication, String> {
    boolean existsByEmail(String email);
    List<FoundingWriterApplication> findAllByOrderByCreatedAtDesc();
    List<FoundingWriterApplication> findByStatusOrderByCreatedAtDesc(FoundingWriterApplicationStatus status);
}
