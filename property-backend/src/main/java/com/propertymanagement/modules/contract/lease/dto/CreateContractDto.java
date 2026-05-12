package com.propertymanagement.modules.contract.lease.dto;

import com.propertymanagement.modules.contract.lease.entity.PaymentFrequency;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.propertymanagement.modules.hr.employee.entity.Employee;

@Data
public class CreateContractDto {

    @NotNull
    private Long tenantId;

    @NotNull
    private Long unitId;

    @NotNull
    private Long propertyId;

    private Long ownerId;
    private Long templateId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private LocalDate signingDate;

    @NotNull
    private BigDecimal monthlyRent;

    private BigDecimal securityDeposit;

    private PaymentFrequency paymentFrequency;

    @Min(1)
    private Integer paymentDay;

    private String currency;
    private Boolean autoRenewable;
    private Integer renewalNoticeDays;
    private String notes;
    private Boolean hasFreeMonth;
    private String rentDiscountReason;
    private String otherReasonText;

    /**
     * Staff audit when updating a draft: PRICE_ADJUSTMENT, TENANT_FREE, EMPLOYEE_DISCOUNT,
     * DATA_CORRECTION, OTHER.
     */
    private String staffModificationReason;
    /** When {@code staffModificationReason} is EMPLOYEE_DISCOUNT. */
    private BigDecimal employeeDiscountPercent;
    /** HR employee id when {@code staffModificationReason} is EMPLOYEE_DISCOUNT. */
    private Long linkedEmployeeId;
}
