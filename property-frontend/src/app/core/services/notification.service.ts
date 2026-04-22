import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private readonly api: ApiService) {}

  getMy(params?: Record<string, string | number | boolean>): Observable<ApiResponse<PagedResponse<AppNotification>>> {
    return this.api.get('/notifications/my', params);
  }

  getUnreadCount(): Observable<ApiResponse<{ unreadCount: number }>> {
    return this.api.get('/notifications/my/unread-count');
  }

  markRead(id: number): Observable<ApiResponse<AppNotification>> {
    return this.api.patch(`/notifications/${id}/read`);
  }

  markAllRead(): Observable<ApiResponse<void>> {
    return this.api.patch('/notifications/my/read-all');
  }
}
