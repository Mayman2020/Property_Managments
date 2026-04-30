import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface AuditLogItem {
  id: number;
  userId?: number;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: number;
  entityLabel?: string;
  notes?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private readonly api: ApiService) {}

  getLogs(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<AuditLogItem>>> {
    return this.api.get('/audit-logs', params);
  }
}
