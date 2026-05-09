package com.propertymanagement.modules.notification;

import com.propertymanagement.modules.notification.dto.NotificationResponse;
import com.propertymanagement.modules.user.User;
import com.propertymanagement.modules.user.UserRepository;
import com.propertymanagement.modules.user.UserRole;
import com.propertymanagement.shared.exception.AppException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;

    @InjectMocks NotificationService service;

    private User recipientUser;

    @BeforeEach
    void setUp() {
        recipientUser = User.builder().id(10L).role(UserRole.TENANT).build();
        setSecurityContext(recipientUser);
    }

    // ── CREATE FOR RECIPIENTS ─────────────────────────────────────────────

    @Test
    void createForRecipients_savesOneNotificationPerRecipient() {
        List<Long> recipients = List.of(1L, 2L, 3L);
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createForRecipients(recipients, null, null, null,
                NotificationType.GENERAL, "Title", "Message");

        verify(notificationRepository, times(3)).save(any(Notification.class));
    }

    @Test
    void createForRecipients_deduplicatesRecipients() {
        // Same user ID twice
        List<Long> recipients = List.of(1L, 1L, 2L);
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createForRecipients(recipients, null, null, null,
                NotificationType.GENERAL, "Title", "Message");

        // Should save only 2 (distinct)
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void createForRecipients_setsCorrectNotificationType() {
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createForRecipients(List.of(1L), null, null, null,
                NotificationType.CONTRACT_AWAITING_OWNER_REVIEW, "title", "msg");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(NotificationType.CONTRACT_AWAITING_OWNER_REVIEW);
    }

    // ── CREATE LOCALIZED ──────────────────────────────────────────────────

    @Test
    void createLocalized_storesParamsWithTitleAndBodyKeys() {
        when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> vars = Map.of("contractNumber", "CNT-001");
        service.createLocalized(
                List.of(1L), null, 10L, null,
                NotificationType.CONTRACT_AWAITING_OWNER_REVIEW,
                "NOTIFICATIONS.TITLE_KEY",
                "NOTIFICATIONS.BODY_KEY",
                vars,
                null);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());

        Notification saved = captor.getValue();
        assertThat(saved.getParams()).isNotNull();
        assertThat(saved.getParams().get("titleKey")).isEqualTo("NOTIFICATIONS.TITLE_KEY");
        assertThat(saved.getParams().get("bodyKey")).isEqualTo("NOTIFICATIONS.BODY_KEY");
    }

    @Test
    void createLocalized_doesNothing_whenRecipientsEmpty() {
        service.createLocalized(
                List.of(), null, null, null,
                NotificationType.GENERAL, "key", "key", Map.of(), null);

        verifyNoInteractions(notificationRepository);
    }

    // ── MARK READ ─────────────────────────────────────────────────────────

    @Test
    void markRead_setsReadAt() {
        Notification notification = Notification.builder()
                .id(1L).recipientUserId(10L).type(NotificationType.GENERAL)
                .title("T").message("M").build();
        when(notificationRepository.findByIdAndRecipientUserId(1L, 10L))
                .thenReturn(Optional.of(notification));
        when(notificationRepository.save(any())).thenReturn(notification);

        service.markRead(1L);

        verify(notificationRepository).save(argThat(n -> n.getReadAt() != null));
    }

    @Test
    void markRead_throwsNotFound_whenNotificationBelongsToDifferentUser() {
        when(notificationRepository.findByIdAndRecipientUserId(1L, 10L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markRead(1L))
                .isInstanceOf(AppException.class);
    }

    // ── UNREAD COUNT ──────────────────────────────────────────────────────

    @Test
    void getMyUnreadCount_returnsCountFromRepository() {
        when(notificationRepository.countByRecipientUserIdAndReadAtIsNull(10L)).thenReturn(5L);

        long count = service.getMyUnreadCount();

        assertThat(count).isEqualTo(5L);
    }

    @Test
    void getMyUnreadCount_returnsZero_whenAllRead() {
        when(notificationRepository.countByRecipientUserIdAndReadAtIsNull(10L)).thenReturn(0L);

        long count = service.getMyUnreadCount();

        assertThat(count).isEqualTo(0L);
    }

    // ── HELPERS ──────────────────────────────────────────────────────────

    private void setSecurityContext(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null,
                        user.getAuthorities() != null ? user.getAuthorities() : List.of()));
    }
}
