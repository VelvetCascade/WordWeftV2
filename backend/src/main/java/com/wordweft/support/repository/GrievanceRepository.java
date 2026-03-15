package com.wordweft.support.repository;

import com.wordweft.support.model.Grievance;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GrievanceRepository extends MongoRepository<Grievance, String> {
    List<Grievance> findByEmail(String email);
    List<Grievance> findByStatus(String status);
}
