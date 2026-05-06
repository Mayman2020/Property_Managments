package com.propertymanagement.modules.contract.payment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class UploadPaymentProofRequest {
    private String proofUrl;
    private List<String> proofUrls;
    private LocalDate paymentDate;
    private String notes;
    private String paymentMethod;
    private String referenceNumber;
}
