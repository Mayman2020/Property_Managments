import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private readonly api: ApiService) {}

  getMy(params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<AppNotification>>> {
    return this.api.get(AppConstants.API.NOTIFICATIONS_MY, params);
  }

  getUnreadCount(): Observable<ApiResponse<{ unreadCount: number }>> {
    return this.api.get(AppConstants.API.NOTIFICATIONS_MY_UNREAD_COUNT);
  }

  markRead(id: number): Observable<ApiResponse<AppNotification>> {
    return this.api.patch(AppConstants.API.NOTIFICATION_READ(id));
  }

  markAllRead(): Observable<ApiResponse<void>> {
    return this.api.patch(AppConstants.API.NOTIFICATIONS_MY_READ_ALL);
  }
}
