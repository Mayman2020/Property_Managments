import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ViolationService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/violations', params);
  }

  getByTenant(tenantId: number): Observable<any> {
    return this.api.get<any>(`/violations/tenant/${tenantId}`);
  }

  getByContract(contractId: number): Observable<any> {
    return this.api.get<any>(`/violations/contract/${contractId}`);
  }

  create(body: any): Observable<any> {
    return this.api.post<any>('/violations', body);
  }

  resolve(id: number, resolution?: string): Observable<any> {
    return this.api.patch<any>(`/violations/${id}/resolve`, { resolution });
  }
}
