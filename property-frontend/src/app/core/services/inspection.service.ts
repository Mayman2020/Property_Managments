import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class InspectionService {

  constructor(private api: ApiService) {}

  getAll(params?: Record<string, string | number | boolean>): Observable<any> {
    return this.api.get<any>('/inspections', params);
  }

  getByUnit(unitId: number): Observable<any> {
    return this.api.get<any>(`/inspections/unit/${unitId}`);
  }

  getByContract(contractId: number): Observable<any> {
    return this.api.get<any>(`/inspections/contract/${contractId}`);
  }

  create(body: any): Observable<any> {
    return this.api.post<any>('/inspections', body);
  }
}
