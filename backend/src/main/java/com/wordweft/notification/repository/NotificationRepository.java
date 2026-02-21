
package com.wordweft.notification.repository;

import com.wordweft.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Notification> findByUserIdAndTypeInOrderByCreatedAtDesc(String userId, List<String> types, Pageable pageable);

    long countByUserIdAndReadFalse(String userId);

    List<Notification> findByUserIdAndReadFalse(String userId);

    // For anti-spam dedup: find recent notification of same type + entity
    List<Notification> findByUserIdAndTypeAndEntityIdAndCreatedAtAfter(
            String userId, String type, String entityId, Instant after);
}
