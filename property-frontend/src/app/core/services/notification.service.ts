import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly unreadCountSubject = new BehaviorSubject<number | null>(null);
  readonly unreadCount$ = this.unreadCountSubject.asObservable();

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

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, count));
  }

  decrementUnread(): void {
    const current = this.unreadCountSubject.value;
    if (current == null) return;
    this.setUnreadCount(Math.max(0, current - 1));
  }
}
