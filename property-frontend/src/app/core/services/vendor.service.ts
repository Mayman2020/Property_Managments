import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface VendorItem {
  id: number;
  propertyId?: number;
  vendorCode?: string;
  vendorName: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  rating?: number;
  totalJobs?: number;
  active?: boolean;
}

export interface VendorPayload {
  propertyId?: number;
  vendorName: string;
  vendorType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  constructor(private readonly api: ApiService) {}

  getVendors(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<VendorItem>>> {
    return this.api.get('/vendors', params);
  }

  getVendor(id: number): Observable<ApiResponse<VendorItem>> {
    return this.api.get(`/vendors/${id}`);
  }

  createVendor(payload: VendorPayload): Observable<ApiResponse<VendorItem>> {
    return this.api.post('/vendors', payload);
  }
}
