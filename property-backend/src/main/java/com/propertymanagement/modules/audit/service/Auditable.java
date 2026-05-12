package com.propertymanagement.modules.audit.service;

import com.propertymanagement.modules.audit.entity.AuditActionType;
import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Auditable {
    AuditActionType action();
    String entity();
    String label() default "";
}
