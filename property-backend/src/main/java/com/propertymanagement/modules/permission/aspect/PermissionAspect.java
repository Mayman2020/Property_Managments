package com.propertymanagement.modules.permission.aspect;

import com.propertymanagement.modules.permission.annotation.RequiresPermission;
import com.propertymanagement.modules.permission.service.PermissionEvaluatorService;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Intercepts controller methods annotated with {@link RequiresPermission} and delegates
 * the permission check to {@link PermissionEvaluatorService}.
 * This runs AFTER Spring Security's JWT filter (authentication already verified).
 */
@Aspect
@Component
@RequiredArgsConstructor
public class PermissionAspect {

    private final PermissionEvaluatorService permissionEvaluator;

    @Around("@annotation(requiredPermission)")
    public Object checkPermission(ProceedingJoinPoint joinPoint, RequiresPermission requiredPermission) throws Throwable {
        permissionEvaluator.assertCan(requiredPermission.module(), requiredPermission.action());
        return joinPoint.proceed();
    }
}
