package com.propertymanagement.modules.reports.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class OccupancyAnalyticsResponse {
    private int totalUnits;
    private int rentedUnits;
    private int vacantUnits;
    private double occupancyRate;
    private BigDecimal totalMonthlyRent;
    private BigDecimal averageMonthlyRent;
    private List<PropertyOccupancy> byProperty;

    @Getter
    @Builder
    public static class PropertyOccupancy {
        private Long propertyId;
        private String propertyName;
        private int totalUnits;
        private int rentedUnits;
        private double occupancyRate;
        private BigDecimal totalMonthlyRent;
    }
}
