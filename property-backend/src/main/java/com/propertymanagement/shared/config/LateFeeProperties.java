package com.propertymanagement.shared.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@ConfigurationProperties(prefix = "property.late-fee")
@Getter
@Setter
public class LateFeeProperties {

    private int gracePeriodDays = 3;
    private BigDecimal lateFeePercentage = new BigDecimal("5");
    private BigDecimal lateFeeFixedAmount = BigDecimal.ZERO;
}
