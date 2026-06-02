package com.propertymanagement.modules.audit.controller;

import com.propertymanagement.modules.audit.entity.AuditActionType;
import com.propertymanagement.modules.audit.entity.AuditLogEntity;
import com.propertymanagement.modules.audit.service.AuditLogService;
import com.propertymanagement.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','GENERAL_MANAGER')")
public class AuditLogController {

    private final AuditLogService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLogEntity>>> list(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) AuditActionType action,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(service.search(userId, entityType, action, pageable)));
    }
}
