import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface FloorItem {
  id: number;
  propertyId: number;
  floorNumber: number;
  floorLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class FloorService {
  constructor(private readonly api: ApiService) {}

  getByProperty(propertyId: number): Observable<ApiResponse<FloorItem[]>> {
    return this.api.get(AppConstants.API.PROPERTY_FLOORS(propertyId));
  }
}
