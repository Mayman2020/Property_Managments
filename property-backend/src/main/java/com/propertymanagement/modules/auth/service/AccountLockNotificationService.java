package com.propertymanagement.modules.auth.service;

import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.service.NotificationService;
import com.propertymanagement.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Emits {@link NotificationType#ACCOUNT_LOCKED} outside the caller's transaction so a rolled-back
 * {@code login()} attempt still persists the inbox row.
 */
@Service
@RequiredArgsConstructor
public class AccountLockNotificationService {

    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyAccountLocked(String email) {
        userRepository.findByEmail(email)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .ifPresent(user -> notificationService.createForRecipients(
                        List.of(user.getId()),
                        null,
                        user.getPropertyId(),
                        null,
                        NotificationType.ACCOUNT_LOCKED,
                        "تم قفل الحساب مؤقتاً",
                        "تجاوزت عدد محاولات تسجيل الدخول الفاشلة. حاول لاحقاً."));
    }
}
