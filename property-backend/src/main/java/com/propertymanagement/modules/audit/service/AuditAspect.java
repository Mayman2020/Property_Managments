package com.propertymanagement.modules.audit.service;

import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.util.List;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogService auditLogService;

    @Around("@annotation(auditable)")
    public Object logAction(ProceedingJoinPoint pjp, Auditable auditable) throws Throwable {
        Object result = pjp.proceed();
        Object entity = extractEntity(result);
        auditLogService.log(
                auditable.action(),
                auditable.entity(),
                extractId(entity),
                auditable.label().isBlank() ? auditable.entity() : auditable.label(),
                null,
                entity,
                List.of(),
                extractPropertyId(entity),
                "Auto-audited action"
        );
        return result;
    }

    private Object extractEntity(Object result) {
        if (result instanceof org.springframework.http.ResponseEntity<?> response) {
            return response.getBody();
        }
        return result;
    }

    private Long extractId(Object entity) {
        try {
            var method = entity.getClass().getMethod("getId");
            Object value = method.invoke(entity);
            return value instanceof Number number ? number.longValue() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long extractPropertyId(Object entity) {
        try {
            var method = entity.getClass().getMethod("getPropertyId");
            Object value = method.invoke(entity);
            return value instanceof Number number ? number.longValue() : null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
