package com.propertymanagement.modules.tenant.dto;

import com.propertymanagement.modules.contract.lease.PaymentFrequency;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Single payload for admin flow: portal user + tenant profile + draft lease contract + unit rented flag,
 * applied in one transaction via {@link com.propertymanagement.modules.tenant.TenantOnboardingService}.
 */
@Data
public class TenantFullOnboardRequest {

    @NotBlank @Email
    private String email;

    /** If blank, the default initial password ("12345") is used — same as the rest of tenant user-creation flows. */
    private String password;

    @NotBlank
    private String fullNameAr;

    @NotBlank
    private String fullNameEn;

    @NotBlank
    private String phone;

    @NotBlank
    private String nationalId;

    @NotNull
    private LocalDate leaseStart;

    @NotNull
    private LocalDate leaseEnd;

    @NotNull
    private Long propertyId;

    @NotNull
    private Long unitId;

    private String profileImageUrl;
    private String profileImage;
    private String civilIdImageUrl;

    @NotEmpty
    private List<String> leaseContractFiles;

    private String notes;

    @NotNull
    private BigDecimal monthlyRent;

    private BigDecimal securityDeposit;

    private PaymentFrequency paymentFrequency;

    private Integer paymentDay;

    private Boolean hasFreeMonth;
    private String rentDiscountReason;
    private String otherReasonText;
}
