package com.propertymanagement.modules.moduleconfig;

import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PropertyModuleAccessInterceptor implements HandlerInterceptor {

    private final PropertyModuleSettingService service;

    private static final Map<String, String> PATH_MODULES = new LinkedHashMap<>();

    static {
        PATH_MODULES.put("/contracts", "contracts");
        PATH_MODULES.put("/contract-templates", "contracts");
        PATH_MODULES.put("/complaints", "contracts");
        PATH_MODULES.put("/vacancies", "vacancies");
        PATH_MODULES.put("/maintenance", "maintenance");
        PATH_MODULES.put("/inventory", "inventory");
        PATH_MODULES.put("/finance", "finance");
        PATH_MODULES.put("/hr", "hr");
        PATH_MODULES.put("/vendors", "vendors");
        PATH_MODULES.put("/notifications", "notifications");
        PATH_MODULES.put("/audit-logs", "audit");
        PATH_MODULES.put("/owner-portal", "owner_portal");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return true;
        }
        if (user.getRole() == UserRole.SUPER_ADMIN
                || user.getRole() == UserRole.GENERAL_MANAGER
                || user.getPropertyId() == null) {
            return true;
        }

        String moduleKey = resolveModuleKey(request.getRequestURI(), request.getContextPath());
        if (moduleKey == null) {
            return true;
        }
        if (!service.isModuleEnabledForProperty(user.getPropertyId(), moduleKey)) {
            throw AppException.forbidden("This module is disabled for the current property");
        }
        return true;
    }

    private String resolveModuleKey(String requestUri, String contextPath) {
        String path = requestUri;
        if (contextPath != null && !contextPath.isBlank() && requestUri.startsWith(contextPath)) {
            path = requestUri.substring(contextPath.length());
        }
        for (Map.Entry<String, String> entry : PATH_MODULES.entrySet()) {
            if (path.equals(entry.getKey()) || path.startsWith(entry.getKey() + "/")) {
                return entry.getValue();
            }
        }
        return null;
    }
}
