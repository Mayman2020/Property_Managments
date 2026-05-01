package com.propertymanagement.modules.maintenance.assignment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractDataRequest(
        LocalDate startDate,       // required
        LocalDate endDate,         // optional
        Integer slaHours,          // optional
        BigDecimal contractValue,  // optional (annual value)
        String notes               // optional
) {}
