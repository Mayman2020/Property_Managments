package com.propertymanagement.modules.permission;

import com.propertymanagement.modules.permission.dto.ScreenSettingResponse;
import com.propertymanagement.modules.permission.dto.ScreenSettingUpdateRequest;
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

    public List<ScreenSettingResponse> getAll() {
        List<ScreenSettingResponse> result = new ArrayList<>();
        for (String key : SCREEN_KEYS) {
            result.add(toResponse(findOrCreate(key)));
        }
        return result;
    }

    public boolean isGloballyEnabled(String screenKey) {
        return findOrCreate(screenKey).isGloballyEnabled();
    }

    @Transactional
    public ScreenSettingResponse update(String screenKey, ScreenSettingUpdateRequest request) {
        ScreenSetting entity = findOrCreate(screenKey);
        entity.setGloballyEnabled(Boolean.TRUE.equals(request.getGloballyEnabled()));
        return toResponse(repository.save(entity));
    }

    private ScreenSetting findOrCreate(String screenKey) {
        validateKey(screenKey);
        return repository.findById(screenKey).orElseGet(() -> repository.save(
                ScreenSetting.builder()
                        .screenKey(screenKey)
                        .globallyEnabled(true)
                        .build()
        ));
    }

    private ScreenSettingResponse toResponse(ScreenSetting entity) {
        return ScreenSettingResponse.builder()
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
