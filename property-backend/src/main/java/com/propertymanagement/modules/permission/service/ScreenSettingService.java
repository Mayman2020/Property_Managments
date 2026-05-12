package com.propertymanagement.modules.permission.service;

import com.propertymanagement.modules.permission.entity.ScreenSettingEntity;
import com.propertymanagement.modules.permission.repository.ScreenSettingRepository;
import com.propertymanagement.modules.permission.dto.ScreenSettingResponseDTO;
import com.propertymanagement.modules.permission.dto.ScreenSettingUpdateRequestDTO;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScreenSettingService {

    private static final String[] SCREEN_KEYS = {
            "dashboard", "properties", "units", "tenants", "maintenance", "inventory",
            "reports", "users", "lookups", "contractors", "ratings", "schedule",
            "profile", "my_unit", "new_request", "my_requests", "permissions"
    };

    private final ScreenSettingRepository repository;

    public List<ScreenSettingResponseDTO> getAll() {
        List<ScreenSettingResponseDTO> result = new ArrayList<>();
        for (String key : SCREEN_KEYS) {
            result.add(toResponse(findOrCreate(key)));
        }
        return result;
    }

    public boolean isGloballyEnabled(String screenKey) {
        return findOrCreate(screenKey).isGloballyEnabled();
    }

    @Transactional
    public ScreenSettingResponseDTO update(String screenKey, ScreenSettingUpdateRequestDTO request) {
        ScreenSettingEntity entity = findOrCreate(screenKey);
        entity.setGloballyEnabled(Boolean.TRUE.equals(request.getGloballyEnabled()));
        return toResponse(repository.save(entity));
    }

    private ScreenSettingEntity findOrCreate(String screenKey) {
        validateKey(screenKey);
        return repository.findById(screenKey).orElseGet(() -> repository.save(
                ScreenSettingEntity.builder()
                        .screenKey(screenKey)
                        .globallyEnabled(true)
                        .build()
        ));
    }

    private ScreenSettingResponseDTO toResponse(ScreenSettingEntity entity) {
        return ScreenSettingResponseDTO.builder()
                .screenKey(entity.getScreenKey())
                .globallyEnabled(entity.isGloballyEnabled())
                .build();
    }

    private void validateKey(String screenKey) {
        for (String key : SCREEN_KEYS) {
            if (key.equals(screenKey)) {
                return;
            }
        }
        throw AppException.badRequest("Unknown screen key: " + screenKey);
    }
}
