package com.propertymanagement.modules.notification.service;

import com.propertymanagement.modules.notification.entity.NotificationEntity;
import com.propertymanagement.modules.notification.entity.NotificationType;
import com.propertymanagement.modules.notification.repository.NotificationRepository;
import com.propertymanagement.modules.notification.dto.NotificationResponseDTO;
import com.propertymanagement.modules.user.entity.User;
import com.propertymanagement.modules.user.repository.UserRepository;
import com.propertymanagement.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public void createForRecipients(Collection<Long> recipientIds,
                                    Long actorUserId,
                                    Long propertyId,
                                    Long requestId,
                                    NotificationType type,
                                    String title,
                                    String message) {
        createForRecipients(recipientIds, actorUserId, propertyId, requestId, type, title, message, null);
    }

    /**
     * Localized variant: pass i18n keys + variables ({@code titleKey}, {@code bodyKey}, {@code vars})
     * via {@code params} so the frontend renders the final localized text. {@code title} / {@code message}
     * may be empty strings when {@code params} is supplied (kept non-null to satisfy the column).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createForRecipients(Collection<Long> recipientIds,
                                    Long actorUserId,
                                    Long propertyId,
                                    Long requestId,
                                    NotificationType type,
                                    String title,
                                    String message,
                                    Map<String, Object> params) {
        Map<String, Object> paramsPayload = emptyToNull(params);
        String safeTitle = title == null ? "" : title;
        String safeMessage = message == null ? "" : message;
        recipientIds.stream().distinct().forEach(recipientId -> {
            NotificationEntity notification = NotificationEntity.builder()
                    .recipientUserId(recipientId)
                    .actorUserId(actorUserId)
                    .propertyId(propertyId)
                    .requestId(requestId)
                    .type(type)
                    .title(safeTitle)
                    .message(safeMessage)
                    .params(paramsPayload)
                    .build();
            notificationRepository.save(notification);
        });
    }

    /**
     * Convenience overload for the new i18n-driven flow: callers pass {@code titleKey},
     * {@code bodyKey} and a {@code vars} map; everything is wrapped into the structured params payload.
     * Title/message columns are stored empty so the frontend always uses the keys.
     */
    public void createLocalized(Collection<Long> recipientIds,
                                Long actorUserId,
                                Long propertyId,
                                Long requestId,
                                NotificationType type,
                                String titleKey,
                                String bodyKey,
                                Map<String, Object> vars) {
        createLocalized(recipientIds, actorUserId, propertyId, requestId, type, titleKey, bodyKey, vars, null);
    }

    /**
     * Same as {@link #createLocalized(Collection, Long, Long, Long, NotificationType, String, String, Map)}
     * with optional navigation hints merged into JSON params (e.g. {@code contractId}, {@code unitId}) for inbox deep-links.
     */
    public void createLocalized(Collection<Long> recipientIds,
                                Long actorUserId,
                                Long propertyId,
                                Long requestId,
                                NotificationType type,
                                String titleKey,
                                String bodyKey,
                                Map<String, Object> vars,
                                Map<String, Object> navigationHints) {
        Map<String, Object> payload = new LinkedHashMap<>();
        if (titleKey != null && !titleKey.isBlank()) {
            payload.put("titleKey", titleKey);
        }
        if (bodyKey != null && !bodyKey.isBlank()) {
            payload.put("bodyKey", bodyKey);
        }
        if (vars != null && !vars.isEmpty()) {
            payload.put("vars", vars);
        }
        if (navigationHints != null) {
            navigationHints.forEach((k, v) -> {
                if (k != null && !k.isBlank() && v != null) {
                    payload.put(k, v);
                }
            });
        }
        createForRecipients(recipientIds, actorUserId, propertyId, requestId, type, "", "", payload.isEmpty() ? null : payload);
    }

    /**
     * {@code scope=recent}: created_at &gt;= now - 14 days. {@code scope=older}: created_at &lt; that cutoff.
     * Sorted by {@code created_at} descending (newest first).
     */
    public Page<NotificationResponseDTO> getMyNotifications(Pageable pageable, String scope) {
        Long userId = currentUserId();
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        String s = scope == null ? "all" : scope.trim().toLowerCase();
        Page<NotificationEntity> page;
        if ("older".equals(s)) {
            page = notificationRepository.findByRecipientUserIdAndCreatedAtLessThanOrderByCreatedAtDesc(userId, cutoff, pageable);
        } else if ("recent".equals(s)) {
            page = notificationRepository.findByRecipientUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(userId, cutoff, pageable);
        } else {
            page = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        Map<Long, String> actorNames = resolveActorNames(page.getContent());
        return page.map(n -> toResponse(n, actorDisplayNameFor(actorNames, n.getActorUserId())));
    }

    public long getMyUnreadCount() {
        return notificationRepository.countByRecipientUserIdAndReadAtIsNull(currentUserId());
    }

    @Transactional
    public NotificationResponseDTO markRead(Long id) {
        Long userId = currentUserId();
        NotificationEntity notification = notificationRepository.findByIdAndRecipientUserId(id, userId)
                .orElseThrow(() -> AppException.notFound("NotificationEntity not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(LocalDateTime.now());
        }
        NotificationEntity saved = notificationRepository.save(notification);
        Map<Long, String> actorNames = resolveActorNames(List.of(saved));
        return toResponse(saved, actorDisplayNameFor(actorNames, saved.getActorUserId()));
    }

    @Transactional
    public void markAllRead() {
        Long userId = currentUserId();
        notificationRepository.markAllReadForUser(userId, LocalDateTime.now());
    }

    private NotificationResponseDTO toResponse(NotificationEntity n, String actorDisplayName) {
        return NotificationResponseDTO.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .actorUserId(n.getActorUserId())
                .actorDisplayName(actorDisplayName)
                .propertyId(n.getPropertyId())
                .requestId(n.getRequestId())
                .read(n.getReadAt() != null)
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .params(emptyToNull(n.getParams()))
                .build();
    }

    private Map<Long, String> resolveActorNames(List<NotificationEntity> notifications) {
        Set<Long> actorIds = notifications.stream()
                .map(NotificationEntity::getActorUserId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());
        if (actorIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> namesById = new HashMap<>();
        userRepository.findAllById(actorIds).forEach(user ->
                namesById.put(user.getId(), pickDisplayName(user)));
        return namesById;
    }

    private static String actorDisplayNameFor(Map<Long, String> actorNames, Long actorUserId) {
        if (actorUserId == null || actorNames == null || actorNames.isEmpty()) {
            return null;
        }
        return actorNames.get(actorUserId);
    }

    private static String pickDisplayName(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail().trim();
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername().trim();
        }
        return null;
    }

    private static Map<String, Object> emptyToNull(Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return null;
        }
        return params;
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User user && user.getId() != null) {
            return user.getId();
        }
        throw AppException.forbidden("Authenticated user is required");
    }
}
