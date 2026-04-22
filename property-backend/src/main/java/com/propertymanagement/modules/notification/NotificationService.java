package com.propertymanagement.modules.notification;

import com.propertymanagement.modules.notification.dto.NotificationResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void createForRecipients(Collection<Long> recipientIds,
                                    Long actorUserId,
                                    Long propertyId,
                                    Long requestId,
                                    NotificationType type,
                                    String title,
                                    String message) {
        recipientIds.stream().distinct().forEach(recipientId -> {
            Notification notification = Notification.builder()
                    .recipientUserId(recipientId)
                    .actorUserId(actorUserId)
                    .propertyId(propertyId)
                    .requestId(requestId)
                    .type(type)
                    .title(title)
                    .message(message)
                    .build();
            notificationRepository.save(notification);
        });
    }

    public Page<NotificationResponse> getMyNotifications(Pageable pageable) {
        Long userId = currentUserId();
        return notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    public long getMyUnreadCount() {
        return notificationRepository.countByRecipientUserIdAndReadAtIsNull(currentUserId());
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        Long userId = currentUserId();
        Notification notification = notificationRepository.findByIdAndRecipientUserId(id, userId)
                .orElseThrow(() -> AppException.notFound("Notification not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead() {
        Long userId = currentUserId();
        Page<Notification> page = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                userId, Pageable.ofSize(500));
        LocalDateTime now = LocalDateTime.now();
        page.getContent().forEach(notification -> {
            if (notification.getReadAt() == null) {
                notification.setReadAt(now);
            }
        });
        notificationRepository.saveAll(page.getContent());
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .propertyId(n.getPropertyId())
                .requestId(n.getRequestId())
                .read(n.getReadAt() != null)
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
