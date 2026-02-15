package com.wordweft.ice.repository;

import com.wordweft.ice.model.IceWorkspace;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface IceWorkspaceRepository extends MongoRepository<IceWorkspace, String> {
    Optional<IceWorkspace> findByOwnerUserIdAndBookId(String ownerUserId, String bookId);
}
