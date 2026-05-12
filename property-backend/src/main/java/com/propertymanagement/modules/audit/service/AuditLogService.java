package com.propertymanagement.modules.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.propertymanagement.modules.audit.entity.AuditActionType;
import com.propertymanagement.modules.audit.entity.AuditLogEntity;
import com.propertymanagement.modules.audit.repository.AuditLogRepository;
import com.propertymanagement.modules.owner.service.OwnerPropertyAccessService;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.entity.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;
    private final OwnerPropertyAccessService ownerPropertyAccessService;

    public AuditLogEntity log(AuditActionType action,
                        String entityType,
                        Long entityId,
                        String entityLabel,
                        Object oldValue,
                        Object newValue,
                        List<String> changedFields,
                        Long propertyId,
                        String notes) {
        User user = currentUser();
        AuditLogEntity log = AuditLogEntity.builder()
                .userId(user != null ? user.getId() : null)
                .userName(user != null ? user.getFullName() : null)
                .userRole(user != null && user.getRole() != null ? user.getRole().name() : null)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .entityLabel(entityLabel)
                .oldValue(writeJson(oldValue))
                .newValue(writeJson(newValue))
                .changedFields(writeJson(changedFields))
                .propertyId(propertyId)
                .notes(notes)
                .build();
        return repository.save(log);
    }

    public Page<AuditLogEntity> search(Long userId, String entityType, AuditActionType action, Pageable pageable) {
        User u = currentUser();
        if (u != null && u.getRole() == UserRole.OWNER) {
            Set<Long> scope = ownerPropertyAccessService.ownerPropertyIdsOrNullIfNotOwner();
            if (scope == null || scope.isEmpty()) {
                return Page.empty(pageable);
            }
            return repository.searchForPropertyScope(userId, entityType, action, scope, pageable);
        }
        return repository.search(userId, entityType, action, pageable);
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }
}
