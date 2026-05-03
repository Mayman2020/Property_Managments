package com.propertymanagement.modules.hr.employee;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(length = 30)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(name = "national_id", length = 30)
    private String nationalId;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "civil_id_image_url", length = 500)
    private String civilIdImageUrl;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "property_id")
    private Long propertyId;

    @Column(name = "job_title_ar")
    private String jobTitleAr;

    @Column(name = "job_title_en")
    private String jobTitleEn;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Column(name = "basic_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal basicSalary;

    @Builder.Default
    @Column(name = "housing_allowance", precision = 10, scale = 2)
    private BigDecimal housingAllowance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "transport_allowance", precision = 10, scale = 2)
    private BigDecimal transportAllowance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "other_allowances", precision = 10, scale = 2)
    private BigDecimal otherAllowances = BigDecimal.ZERO;

    @Column(name = "total_salary", precision = 12, scale = 2, insertable = false, updatable = false)
    private BigDecimal totalSalary;

    @Builder.Default
    @Column(length = 10)
    private String currency = "SAR";

    @Column(length = 20)
    private String status;

    @Column(name = "linked_user_id")
    private Long linkedUserId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null || status.isBlank()) {
            status = "ACTIVE";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
