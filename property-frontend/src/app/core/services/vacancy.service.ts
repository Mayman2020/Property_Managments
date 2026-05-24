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
  listingSource?: string;
  unitId?: number;
  propertyId?: number;
  viewsCount?: number;
  ownerNameAr?: string;
  ownerNameEn?: string;
}

export interface CreateVacancyPayload {
  unitId: number;
  propertyId: number;
  askingRent?: number;
  currency?: string;
  availableFrom?: string;
  titleAr?: string;
  titleEn?: string;
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

  createInquiry(listingId: number, body: Partial<VacancyInquiryItem> & { inquirerName: string; inquirerPhone: string }): Observable<ApiResponse<VacancyInquiryItem>> {
    return this.api.post(AppConstants.API.VACANCY_CREATE_INQUIRY(listingId), body);
  }

  updateInquiryStatus(inquiryId: number, status: string): Observable<ApiResponse<VacancyInquiryItem>> {
    return this.api.patch(AppConstants.API.VACANCY_INQUIRY_STATUS(inquiryId), { status });
  }

  convertInquiry(inquiryId: number): Observable<ApiResponse<{ inquiryId: number; tenantId: number; contractId: number }>> {
    return this.api.post(AppConstants.API.VACANCY_INQUIRY_CONVERT(inquiryId), {});
  }

  getByUnitId(unitId: number): Observable<ApiResponse<VacancyItem | null>> {
    return this.api.get(AppConstants.API.VACANCY_BY_UNIT(unitId));
  }

  createListing(body: CreateVacancyPayload): Observable<ApiResponse<VacancyItem>> {
    return this.api.post(AppConstants.API.VACANCIES, body);
  }
}
