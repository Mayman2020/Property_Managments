package com.propertymanagement.modules.moduleconfig;

import com.propertymanagement.shared.persistence.StringListJsonConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "module_definitions")
@Getter
@Setter
public class ModuleDefinition {

    @Id
    @Column(name = "module_key", length = 80)
    private String moduleKey;

    @Column(name = "title_ar", nullable = false)
    private String titleAr;

    @Column(name = "title_en")
    private String titleEn;

    @Column(name = "description_ar")
    private String descriptionAr;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "icon")
    private String icon;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "required_modules")
    private List<String> requiredModules = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "recommended_modules")
    private List<String> recommendedModules = new ArrayList<>();

    @Column(name = "monthly_price", precision = 12, scale = 2)
    private BigDecimal monthlyPrice;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_active")
    private boolean active;
}
