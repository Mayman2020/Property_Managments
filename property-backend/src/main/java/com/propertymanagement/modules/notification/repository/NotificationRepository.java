package com.propertymanagement.modules.notification.repository;

import com.propertymanagement.modules.notification.entity.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    Page<NotificationEntity> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    Page<NotificationEntity> findByRecipientUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            Long recipientUserId, LocalDateTime createdAtMinInclusive, Pageable pageable);

    Page<NotificationEntity> findByRecipientUserIdAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long recipientUserId, LocalDateTime createdAtBefore, Pageable pageable);
    long countByRecipientUserIdAndReadAtIsNull(Long recipientUserId);
    Optional<NotificationEntity> findByIdAndRecipientUserId(Long id, Long recipientUserId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.readAt = :now WHERE n.recipientUserId = :userId AND n.readAt IS NULL")
    int markAllReadForUser(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
