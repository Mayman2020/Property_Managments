import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface VacancyItem {
  id: number;
  titleAr?: string;
  titleEn?: string;
  propertyName?: string;
  unitNumber?: string;
  askingRent?: number;
  availableFrom?: string;
  isPublished?: boolean;
  viewsCount?: number;
}

export interface VacancyInquiryItem {
  id: number;
  inquirerName: string;
  inquirerPhone: string;
  inquirerEmail?: string;
  status?: string;
  preferredStart?: string;
}

@Injectable({ providedIn: 'root' })
export class VacancyService {
  constructor(private readonly api: ApiService) {}

  getListings(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<VacancyItem>>> {
    return this.api.get(AppConstants.API.VACANCIES, params);
  }

  getInquiries(listingId: number): Observable<ApiResponse<VacancyInquiryItem[]>> {
    return this.api.get(AppConstants.API.VACANCY_INQUIRIES(listingId));
  }
}
