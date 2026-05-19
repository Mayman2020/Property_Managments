package com.propertymanagement.modules.maintenance.invoice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MaintenanceInvoiceFilterOptionsDto {

    private List<PropertyOption> properties;
    private List<CompanyOption> companies;

    @Data
    @Builder
    public static class PropertyOption {
        private Long id;
        private String name;
        private String nameAr;
        private String nameEn;
    }

    @Data
    @Builder
    public static class CompanyOption {
        private Long id;
        private String name;
        private String nameAr;
        private String nameEn;
    }
}
