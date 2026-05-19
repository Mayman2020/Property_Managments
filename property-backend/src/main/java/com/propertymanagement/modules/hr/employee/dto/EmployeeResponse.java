package com.propertymanagement.modules.hr.employee.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class EmployeeResponse {
    private Long id;
    private Long propertyId;
    private String employeeCode;
    private String fullName;
    private String fullNameAr;
    private String fullNameEn;
    private String phone;
    private String email;
    private String nationalId;
    private String profileImageUrl;
    private String civilIdImageUrl;
    private String jobTitle;
    private String jobTitleAr;
    private String jobTitleEn;
    private BigDecimal basicSalary;
    private BigDecimal totalSalary;
    private String status;
    private LocalDate hireDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
