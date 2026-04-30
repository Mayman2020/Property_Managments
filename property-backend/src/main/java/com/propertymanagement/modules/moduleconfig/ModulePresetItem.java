package com.propertymanagement.modules.moduleconfig;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "module_preset_items")
@Getter
@Setter
public class ModulePresetItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "preset_code", nullable = false)
    private String presetCode;

    @Column(name = "module_key", nullable = false)
    private String moduleKey;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled;
}
