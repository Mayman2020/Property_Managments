package com.propertymanagement.modules.contract.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder
public class ScheduleItemResponse {
    private Long id;
    private Long contractId;
    private LocalDate dueDate;
    private BigDecimal amount;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String status;
    private long daysOverdue;
    private LocalDateTime createdAt;
}
