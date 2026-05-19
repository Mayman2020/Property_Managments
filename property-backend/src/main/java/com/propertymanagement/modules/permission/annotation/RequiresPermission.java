package com.propertymanagement.modules.permission.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Enforces DB-stored role_permissions check on the annotated controller method.
 * Replaces hardcoded @PreAuthorize role lists so access is driven by the admin-configurable
 * permission matrix rather than code deploys.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {
    /** Module key matching role_permissions JSON (e.g. "properties", "users", "hr"). */
    String module();
    /** Action to check (e.g. "view", "create", "edit", "delete", "toggle"). */
    String action() default "view";
}
