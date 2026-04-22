package com.propertymanagement.config;

import com.propertymanagement.shared.security.SecurityAuditorAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

@Configuration
public class AuditingConfig {

    @Bean(name = "auditorProvider")
    public AuditorAware<Long> auditorProvider(SecurityAuditorAware securityAuditorAware) {
        return securityAuditorAware;
    }
}
