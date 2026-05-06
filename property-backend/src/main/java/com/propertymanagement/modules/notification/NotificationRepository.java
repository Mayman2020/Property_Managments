package com.propertymanagement.modules.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            Long recipientUserId, LocalDateTime createdAtMinInclusive, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long recipientUserId, LocalDateTime createdAtBefore, Pageable pageable);
    long countByRecipientUserIdAndReadAtIsNull(Long recipientUserId);
    Optional<Notification> findByIdAndRecipientUserId(Long id, Long recipientUserId);
}
