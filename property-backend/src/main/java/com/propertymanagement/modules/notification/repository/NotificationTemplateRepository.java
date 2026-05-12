package com.propertymanagement.modules.notification.repository;

import com.propertymanagement.modules.notification.entity.NotificationTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplateEntity, Long> {
    Optional<NotificationTemplateEntity> findByTemplateCodeAndActiveTrue(String templateCode);
}
