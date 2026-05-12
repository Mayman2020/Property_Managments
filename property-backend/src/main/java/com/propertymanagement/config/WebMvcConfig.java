package com.propertymanagement.config;

import com.propertymanagement.modules.moduleconfig.service.PropertyModuleAccessInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final PropertyModuleAccessInterceptor propertyModuleAccessInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(propertyModuleAccessInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/auth/**", "/files/**");
    }
}
