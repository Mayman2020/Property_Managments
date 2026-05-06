package com.propertymanagement.modules.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    @Query("""
            select a from AuditLog a
            where (:userId is null or a.userId = :userId)
              and (:entityType is null or a.entityType = :entityType)
              and (:action is null or a.action = :action)
            order by a.createdAt desc
            """)
    Page<AuditLog> search(@Param("userId") Long userId,
                          @Param("entityType") String entityType,
                          @Param("action") AuditAction action,
                          Pageable pageable);

    @Query("""
            select a from AuditLog a
            where (:userId is null or a.userId = :userId)
              and (:entityType is null or a.entityType = :entityType)
              and (:action is null or a.action = :action)
              and a.propertyId is not null
              and a.propertyId in :propertyIds
            order by a.createdAt desc
            """)
    Page<AuditLog> searchForPropertyScope(@Param("userId") Long userId,
                                          @Param("entityType") String entityType,
                                          @Param("action") AuditAction action,
                                          @Param("propertyIds") Collection<Long> propertyIds,
                                          Pageable pageable);
}
