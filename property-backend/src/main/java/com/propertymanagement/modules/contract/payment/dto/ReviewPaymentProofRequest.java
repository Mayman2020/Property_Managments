package com.propertymanagement.modules.contract.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReviewPaymentProofRequest {
    @NotBlank
    private String status;
    private String notes;
}
