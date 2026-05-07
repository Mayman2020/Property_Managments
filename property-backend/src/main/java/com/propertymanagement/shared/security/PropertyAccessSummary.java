package com.propertymanagement.shared.security;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PropertyAccessSummary {
    /** When true, active role may see all properties (SUPER_ADMIN / GENERAL_MANAGER). */
    private boolean unrestricted;
    /** Sorted property ids the user may access when {@code unrestricted} is false. */
    private List<Long> propertyIds;
}
