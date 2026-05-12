package com.propertymanagement.modules.moduleconfig.service;

import com.propertymanagement.modules.moduleconfig.entity.ModuleDefinitionEntity;
import com.propertymanagement.modules.moduleconfig.entity.PropertyModuleSettingEntity;
import com.propertymanagement.modules.moduleconfig.repository.ModuleDefinitionRepository;
import com.propertymanagement.modules.moduleconfig.repository.PropertyModuleSettingRepository;
import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingResponseDTO;
import com.propertymanagement.modules.moduleconfig.dto.PropertyModuleSettingsUpdateRequestDTO;
import com.propertymanagement.modules.property.repository.PropertyRepository;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import com.propertymanagement.modules.property.entity.Property;

@Service
@RequiredArgsConstructor
public class PropertyModuleSettingService {

    private final PropertyModuleSettingRepository repository;
    private final PropertyRepository propertyRepository;
    private final ModuleDefinitionRepository moduleDefinitionRepository;

    public List<PropertyModuleSettingResponseDTO> getMySettings() {
        User user = currentUser();
        if (user.getRole() == UserRole.SUPER_ADMIN || user.getPropertyId() == null) {
            return defaultResponses(null);
        }
        // Any role can read their own property's module settings (no manageability check)
        return getSettingsForProperty(user.getPropertyId());
    }

    public List<PropertyModuleSettingResponseDTO> getByProperty(Long propertyId) {
        ensureManageable(propertyId);
        return getSettingsForProperty(propertyId);
    }

    public List<PropertyModuleSettingResponseDTO> getSettingsSnapshot(Long propertyId) {
        return getSettingsForProperty(propertyId);
    }

    private List<PropertyModuleSettingResponseDTO> getSettingsForProperty(Long propertyId) {
        propertyRepository.findById(propertyId)
                .orElseThrow(() -> AppException.notFound("Property not found: " + propertyId));

        Map<String, Boolean> saved = repository.findByPropertyIdOrderByModuleKeyAsc(propertyId).stream()
                .collect(LinkedHashMap::new, (acc, item) -> acc.put(item.getModuleKey(), item.isEnabled()), Map::putAll);

        List<PropertyModuleSettingResponseDTO> result = new ArrayList<>();
        for (String moduleKey : moduleCatalog()) {
            result.add(PropertyModuleSettingResponseDTO.builder()
                    .propertyId(propertyId)
                    .moduleKey(moduleKey)
                    .enabled(saved.getOrDefault(moduleKey, true))
                    .build());
        }
        return result;
    }

    @Transactional
    public List<PropertyModuleSettingResponseDTO> updateProperty(Long propertyId, PropertyModuleSettingsUpdateRequestDTO request) {
        ensureManageable(propertyId);
        propertyRepository.findById(propertyId)
                .orElseThrow(() -> AppException.notFound("Property not found: " + propertyId));

        Map<String, Boolean> incoming = request.getModules() != null ? request.getModules() : Map.of();
        Map<String, ModuleDefinitionEntity> definitions = definitionsByKey();
        Map<String, Boolean> resolved = resolveModuleState(definitions, incoming);
        for (String moduleKey : moduleCatalog()) {
            boolean enabled = resolved.getOrDefault(moduleKey, true);
            PropertyModuleSettingEntity entity = repository.findByPropertyIdAndModuleKey(propertyId, moduleKey)
                    .orElse(PropertyModuleSettingEntity.builder()
                            .propertyId(propertyId)
                            .moduleKey(moduleKey)
                            .build());
            entity.setEnabled(enabled);
            repository.save(entity);
        }
        return getSettingsForProperty(propertyId);
    }

    public boolean isModuleEnabledForProperty(Long propertyId, String moduleKey) {
        if (propertyId == null || moduleKey == null || !moduleCatalog().contains(moduleKey)) {
            return true;
        }
        return repository.findByPropertyIdAndModuleKey(propertyId, moduleKey)
                .map(PropertyModuleSettingEntity::isEnabled)
                .orElse(true);
    }

    public List<String> moduleCatalog() {
        return moduleDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscModuleKeyAsc().stream()
                .map(ModuleDefinitionEntity::getModuleKey)
                .toList();
    }

    private List<PropertyModuleSettingResponseDTO> defaultResponses(Long propertyId) {
        List<PropertyModuleSettingResponseDTO> result = new ArrayList<>();
        for (String moduleKey : moduleCatalog()) {
            result.add(PropertyModuleSettingResponseDTO.builder()
                    .propertyId(propertyId)
                    .moduleKey(moduleKey)
                    .enabled(true)
                    .build());
        }
        return result;
    }

    private void ensureManageable(Long propertyId) {
        User user = currentUser();
        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return;
        }
        if (user.getRole() == UserRole.GENERAL_MANAGER) {
            // Allow if user has no assigned property (global admin) or if their property matches
            if (user.getPropertyId() == null || Objects.equals(user.getPropertyId(), propertyId)) {
                return;
            }
        }
        throw AppException.forbidden("You cannot manage module settings for this property");
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        throw AppException.forbidden("Authenticated user is required");
    }

    private Map<String, ModuleDefinitionEntity> definitionsByKey() {
        Map<String, ModuleDefinitionEntity> definitions = new LinkedHashMap<>();
        for (ModuleDefinitionEntity definition : moduleDefinitionRepository.findByActiveTrueOrderByDisplayOrderAscModuleKeyAsc()) {
            definitions.put(definition.getModuleKey(), definition);
        }
        return definitions;
    }

    private Map<String, Boolean> resolveModuleState(Map<String, ModuleDefinitionEntity> definitions, Map<String, Boolean> incoming) {
        Map<String, Boolean> resolved = new LinkedHashMap<>();
        for (String moduleKey : definitions.keySet()) {
            resolved.put(moduleKey, incoming.getOrDefault(moduleKey, true));
        }

        boolean changed;
        do {
            changed = false;
            for (ModuleDefinitionEntity definition : definitions.values()) {
                if (Boolean.TRUE.equals(resolved.get(definition.getModuleKey()))) {
                    for (String required : definition.getRequiredModules()) {
                        if (definitions.containsKey(required) && !Boolean.TRUE.equals(resolved.get(required))) {
                            resolved.put(required, true);
                            changed = true;
                        }
                    }
                }
            }
        } while (changed);

        boolean changedByDependents;
        do {
            changedByDependents = false;
            for (ModuleDefinitionEntity definition : definitions.values()) {
                if (!Boolean.TRUE.equals(resolved.get(definition.getModuleKey()))) {
                    for (ModuleDefinitionEntity dependent : definitions.values()) {
                        if (dependent.getRequiredModules().contains(definition.getModuleKey())
                                && Boolean.TRUE.equals(resolved.get(dependent.getModuleKey()))) {
                            resolved.put(dependent.getModuleKey(), false);
                            changedByDependents = true;
                        }
                    }
                }
            }
        } while (changedByDependents);

        return resolved;
    }
}
