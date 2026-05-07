import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';

@Injectable({ providedIn: 'root' })
export class ComplaintService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>(AppConstants.API.COMPLAINTS, params);
  }

  create(body: any): Observable<any> {
    return this.api.post<any>(AppConstants.API.COMPLAINTS, body);
  }

  assign(id: number, officerId: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.COMPLAINT_ASSIGN(id), { officerId });
  }

  resolve(id: number, resolution?: string): Observable<any> {
    return this.api.patch<any>(AppConstants.API.COMPLAINT_RESOLVE(id), { resolution });
  }
}
