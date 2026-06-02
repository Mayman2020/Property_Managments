import { Router } from '@angular/router';
import { AppNotification } from '../models/notification.model';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { resolveNotificationTargetUrl } from './notification-navigation.util';
import { snoozeOverdueNotice } from './overdue-notice.util';

/** Mark read, sync badge, snooze overdue notices, then navigate to the mapped screen (if any). */
export function openNotification(
  item: AppNotification,
  auth: AuthService,
  router: Router,
  notificationService: NotificationService
): void {
  if (!item.read) {
    notificationService.markRead(item.id).subscribe(() => {
      item.read = true;
      notificationService.decrementUnread();
    });
  }

  if (item.type === 'RENT_OVERDUE') {
    const params = item.params as Record<string, unknown> | null | undefined;
    const nested = params?.['vars'] as Record<string, unknown> | undefined;
    const scheduleId = Number(params?.['scheduleId'] ?? nested?.['scheduleId']);
    if (Number.isFinite(scheduleId) && scheduleId > 0) {
      snoozeOverdueNotice(scheduleId);
    }
  }

  const target = resolveNotificationTargetUrl(item, auth);
  if (target != null && target !== '') {
    void router.navigateByUrl(target);
    return;
  }
}
