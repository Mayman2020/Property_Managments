import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ComplaintService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/complaints', params);
  }

  create(body: any): Observable<any> {
    return this.api.post<any>('/complaints', body);
  }

  assign(id: number, officerId: number): Observable<any> {
    return this.api.patch<any>(`/complaints/${id}/assign`, { officerId });
  }

  resolve(id: number, resolution?: string): Observable<any> {
    return this.api.patch<any>(`/complaints/${id}/resolve`, { resolution });
  }
}
