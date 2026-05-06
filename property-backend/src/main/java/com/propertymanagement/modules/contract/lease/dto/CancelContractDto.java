package com.propertymanagement.modules.contract.lease.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CancelContractDto {

    @Size(max = 2000)
    private String reason;
}
