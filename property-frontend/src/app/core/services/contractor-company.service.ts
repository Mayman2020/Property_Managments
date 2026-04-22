import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';

export interface ContractorCompany {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractorCompanyForm {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContractorCompanyService {
  constructor(private readonly api: ApiService) {}

  list(all = false): Observable<ApiResponse<ContractorCompany[]>> {
    return this.api.get('/contractor-companies', { all });
  }

  create(body: ContractorCompanyForm): Observable<ApiResponse<ContractorCompany>> {
    return this.api.post('/contractor-companies', body);
  }

  update(id: number, body: ContractorCompanyForm): Observable<ApiResponse<ContractorCompany>> {
    return this.api.put(`/contractor-companies/${id}`, body);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.api.delete(`/contractor-companies/${id}`);
  }
}
