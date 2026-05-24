package com.propertymanagement.modules.contract.template.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "contract_templates")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContractTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "template_name_ar", length = 200)
    private String templateNameAr;

    @Column(name = "template_name_en", length = 200)
    private String templateNameEn;

    @Column(name = "template_type", length = 30)
    private String templateType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    /**
     * Optional JSON map of template variables (e.g. tokens used inside {@link #content}).
     * Stored as native JSONB; Hibernate 6 needs {@link JdbcTypeCode} to bind a String to
     * a jsonb column without the legacy varchar→jsonb cast error.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String variables;

    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
