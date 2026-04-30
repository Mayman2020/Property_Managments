package com.propertymanagement.modules.moduleconfig;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "module_presets")
@Getter
@Setter
public class ModulePreset {

    @Id
    @Column(name = "preset_code", length = 80)
    private String presetCode;

    @Column(name = "preset_name_ar", nullable = false)
    private String presetNameAr;

    @Column(name = "preset_name_en")
    private String presetNameEn;

    @Column(name = "description_ar")
    private String descriptionAr;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_active")
    private boolean active;
}
