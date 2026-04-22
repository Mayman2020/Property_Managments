import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

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

  getItems(propertyId?: number, page = 0, size = 20): Observable<ApiResponse<PagedResponse<InventoryItem>>> {
    return this.api.get('/inventory', { page, size, ...(propertyId ? { propertyId } : {}) });
  }

  getLowStock(): Observable<ApiResponse<InventoryItem[]>> {
    return this.api.get('/inventory/low-stock');
  }

  create(item: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
    return this.api.post('/inventory', item);
  }

  update(id: number, item: Partial<InventoryItem>): Observable<ApiResponse<InventoryItem>> {
    return this.api.put(`/inventory/${id}`, item);
  }

  addTransaction(transaction: { itemId: number; quantity: number; transactionType: 'IN' | 'OUT'; notes?: string }): Observable<ApiResponse<InventoryTransaction>> {
    return this.api.post('/inventory/transactions', transaction);
  }

  getTransactions(params?: Record<string, string | number>): Observable<ApiResponse<PagedResponse<InventoryTransaction>>> {
    return this.api.get('/inventory/transactions', params);
  }
}
