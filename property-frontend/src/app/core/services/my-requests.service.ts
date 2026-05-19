import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface MyRequestItem {
  sourceType: string;
  sourceId: number;
  referenceNumber?: string | null;
  title: string;
  subject?: string | null;
  status?: string | null;
  progress?: string | null;
  requestedAt?: string | null;
  targetType?: string | null;
  targetId?: number | null;
  targetLabel?: string | null;
  notes?: string | null;
  route?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MyRequestsService {
  constructor(private readonly api: ApiService) {}

  listMine(): Observable<ApiResponse<MyRequestItem[]>> {
    return this.api.get<ApiResponse<MyRequestItem[]>>(AppConstants.API.MY_REQUESTS);
  }
}
