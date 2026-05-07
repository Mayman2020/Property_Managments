import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';

export interface HrEmployeeRow {
  id: number;
  fullName: string;
  fullNameAr?: string;
  fullNameEn?: string;
  email?: string;
  employeeCode?: string;
  jobTitle?: string;
}

@Injectable({ providedIn: 'root' })
export class HrEmployeeService {
  constructor(private readonly api: ApiService) {}

  list(page = 0, size = 200, q?: string): Observable<{ data?: { content?: HrEmployeeRow[] } }> {
    return this.api.get<{ data?: { content?: HrEmployeeRow[] } }>(AppConstants.API.HR_EMPLOYEES, {
      page,
      size,
      ...(q ? { q } : {})
    });
  }
}
