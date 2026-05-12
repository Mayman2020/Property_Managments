package com.propertymanagement.modules.maintenance.assignment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import com.propertymanagement.modules.user.entity.User;

@Entity
@Table(name = "maintenance_providers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_type", nullable = false, length = 10)
    private String providerType; // USER | COMPANY

    @Column(name = "user_id", unique = true)
    private Long userId;

    @Column(name = "company_id", unique = true)
    private Long companyId;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
