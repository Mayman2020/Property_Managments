import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';
import { withPageParams } from '../utils/pagination.util';

export interface InventoryItem {
  id: number;
  propertyId: number;
  itemCode: string;
  itemNameAr: string;
  itemNameEn?: string;
  unitOfMeasure?: string;
  quantity: number;
  minQuantity: number;
  location?: string;
  isLowStock: boolean;
  createdAt: string;
}

export interface InventoryTransaction {
  id: number;
  requestId?: number;
  requestNumber?: string;
  itemId: number;
  itemName?: string;
  transactionType: 'IN' | 'OUT';
  quantity: number;
  notes?: string;
  performedBy: number;
  performedByName?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private readonly api: ApiService) {}

  getItems(propertyId?: number, page = 0, size = 20, q?: string): Observable<ApiResponse<PagedResponse<InventoryItem>>> {
    const url = propertyId ? AppConstants.API.INVENTORY_BY_PROPERTY(propertyId) : AppConstants.API.INVENTORY;
    return this.api.get(url, withPageParams(page, size, { q: q?.trim() || undefined }));
  }

  getLowStock(): Observable<ApiResponse<InventoryItem[]>> {
    return this.api.get(AppConstants.API.INVENTORY_LOW_STOCK);
  }

  create(item: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
    return this.api.post(AppConstants.API.INVENTORY, item);
  }

  update(id: number, item: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
    return this.api.put(AppConstants.API.INVENTORY_BY_ID(id), item);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.api.delete(AppConstants.API.INVENTORY_BY_ID(id));
  }

  addTransaction(transaction: { itemId: number; quantity: number; transactionType: 'IN' | 'OUT'; notes?: string }): Observable<ApiResponse<InventoryTransaction>> {
    return this.api.post(AppConstants.API.INVENTORY_TRANSACTIONS, transaction);
  }

  getTransactions(params?: Record<string, string | number>): Observable<ApiResponse<PagedResponse<InventoryTransaction>>> {
    return this.api.get(AppConstants.API.INVENTORY_TRANSACTIONS, params);
  }
}
