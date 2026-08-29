package com.wordweft.community.repository;

import com.wordweft.community.model.CommunityCircle;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CommunityCircleRepository extends MongoRepository<CommunityCircle, String> {
    List<CommunityCircle> findByActiveTrueOrderByOfficialDescNameAsc();
    Optional<CommunityCircle> findBySlugAndActiveTrue(String slug);
}
