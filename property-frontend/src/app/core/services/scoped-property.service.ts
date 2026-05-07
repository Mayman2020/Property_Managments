import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse } from '../models/api-response.model';

export interface PropertyScopeSummary {
  unrestricted: boolean;
  propertyIds: number[];
}

const SELECTED_PROPERTY_STORAGE_KEY = 'pm_selected_property_id';

@Injectable({ providedIn: 'root' })
export class ScopedPropertyService {
  private readonly scope$ = new BehaviorSubject<PropertyScopeSummary | null>(null);
  private readonly selectedPropertyId$ = new BehaviorSubject<number | null>(this.readPersistedSelectedPropertyId());

  readonly propertyScope = this.scope$.asObservable();
  readonly selectedPropertyId = this.selectedPropertyId$.asObservable();

  constructor(private readonly api: ApiService) {}

  get selectedPropertyIdValue(): number | null {
    return this.selectedPropertyId$.value;
  }

  get scopeValue(): PropertyScopeSummary | null {
    return this.scope$.value;
  }

  refreshScope(): void {
    this.api.get<ApiResponse<PropertyScopeSummary>>(AppConstants.API.USERS_ME_PROPERTY_ACCESS).subscribe({
      next: (res) => {
        const scope = res.data ?? { unrestricted: false, propertyIds: [] };
        this.scope$.next(scope);
        this.ensureValidSelection(scope);
      },
      error: () => {
        this.scope$.next(null);
        this.setSelectedPropertyId(null);
      }
    });
  }

  setSelectedPropertyId(id: number | null): void {
    this.selectedPropertyId$.next(id);
    if (id == null || !Number.isFinite(id) || id <= 0) {
      localStorage.removeItem(SELECTED_PROPERTY_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SELECTED_PROPERTY_STORAGE_KEY, String(id));
  }

  private ensureValidSelection(scope: PropertyScopeSummary): void {
    if (!scope || scope.unrestricted) {
      this.setSelectedPropertyId(null);
      return;
    }
    const ids = Array.from(new Set((scope.propertyIds ?? []).filter((x) => Number.isFinite(x) && x > 0))).sort((a, b) => a - b);
    if (!ids.length) {
      this.setSelectedPropertyId(null);
      return;
    }
    const current = this.selectedPropertyId$.value;
    if (current != null && ids.includes(current)) {
      this.setSelectedPropertyId(current);
      return;
    }
    this.setSelectedPropertyId(ids[0]);
  }

  private readPersistedSelectedPropertyId(): number | null {
    const raw = localStorage.getItem(SELECTED_PROPERTY_STORAGE_KEY);
    if (!raw) return null;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }
}
