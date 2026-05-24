package com.propertymanagement.modules.vacancy.service;

import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import com.propertymanagement.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class VacancyAlertRecipients {

    private final UserRepository userRepository;

    public List<Long> resolve(Long propertyId) {
        Set<Long> ids = new LinkedHashSet<>();
        userRepository.findByRoleAndActiveTrue(UserRole.SUPER_ADMIN).stream()
                .map(User::getId).forEach(ids::add);
        userRepository.findByRoleAndActiveTrue(UserRole.GENERAL_MANAGER).stream()
                .map(User::getId).forEach(ids::add);
        if (propertyId != null) {
            userRepository.findByPropertyIdAndRoleAndActiveTrue(propertyId, UserRole.ACCOUNTANT).stream()
                    .map(User::getId).forEach(ids::add);
        }
        return new ArrayList<>(ids);
    }
}
