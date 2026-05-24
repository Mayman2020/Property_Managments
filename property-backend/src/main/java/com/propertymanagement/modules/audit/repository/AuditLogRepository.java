package com.propertymanagement.modules.audit.repository;

import com.propertymanagement.modules.audit.entity.AuditActionType;
import com.propertymanagement.modules.audit.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {
    @Query("""
            select a from AuditLogEntity a
            where (:userId is null or a.userId = :userId)
              and (:entityType is null or a.entityType = :entityType)
              and (:action is null or a.action = :action)
            order by a.createdAt desc
            """)
    Page<AuditLogEntity> search(@Param("userId") Long userId,
                          @Param("entityType") String entityType,
                          @Param("action") AuditActionType action,
                          Pageable pageable);

    @Query("""
            select a from AuditLogEntity a
            where (:userId is null or a.userId = :userId)
              and (:entityType is null or a.entityType = :entityType)
              and (:action is null or a.action = :action)
              and a.propertyId is not null
              and a.propertyId in :propertyIds
            order by a.createdAt desc
            """)
    Page<AuditLogEntity> searchForPropertyScope(@Param("userId") Long userId,
                                          @Param("entityType") String entityType,
                                          @Param("action") AuditActionType action,
                                          @Param("propertyIds") Collection<Long> propertyIds,
                                          Pageable pageable);

    Page<AuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AuditLogEntity> findByPropertyIdInOrderByCreatedAtDesc(Collection<Long> propertyIds, Pageable pageable);
}
