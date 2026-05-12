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

  getMy(): Observable<any> {
    return this.api.get<any>(AppConstants.API.COMPLAINTS_MY);
  }

  getMyActiveUnits(): Observable<any> {
    return this.api.get<any>(AppConstants.API.COMPLAINTS_MY_ACTIVE_UNITS);
  }

  getById(id: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.COMPLAINT_BY_ID(id));
  }

  create(body: any): Observable<any> {
    return this.api.post<any>(AppConstants.API.COMPLAINTS, body);
  }

  addReply(id: number, message: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.COMPLAINT_REPLY(id), { message });
  }

  close(id: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.COMPLAINT_CLOSE(id), {});
  }

  submitRating(id: number, rating: string): Observable<any> {
    return this.api.post<any>(AppConstants.API.COMPLAINT_RATING(id), { rating });
  }

  getRating(id: number): Observable<any> {
    return this.api.get<any>(AppConstants.API.COMPLAINT_RATING(id));
  }

  assign(id: number, officerId: number): Observable<any> {
    return this.api.patch<any>(AppConstants.API.COMPLAINT_ASSIGN(id), { officerId });
  }

  resolve(id: number, resolution?: string): Observable<any> {
    return this.api.patch<any>(AppConstants.API.COMPLAINT_RESOLVE(id), { resolution });
  }

  createMaintenanceRequest(id: number, body?: { categoryId?: number; titleOverride?: string }): Observable<any> {
    return this.api.post<any>(AppConstants.API.COMPLAINT_MAINTENANCE_REQUEST(id), body ?? {});
  }
}
