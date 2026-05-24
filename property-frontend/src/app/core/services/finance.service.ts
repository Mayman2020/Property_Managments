import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppConstants } from '../constants/app-constants';
import { ApiResponse, PagedResponse } from '../models/api-response.model';

export interface FinanceDashboardDto {
  thisMonthCollected: number;
  thisMonthExpenses: number;
  netIncome: number;
  overdueAmount: number;
  budgetUtilizationPct: number;
}

export interface ExpenseItem {
  id: number;
  expenseNumber: string;
  description: string;
  amount: number;
  currency?: string;
  expenseDate: string;
  status?: string;
  categoryName?: string;
}

export interface RevenueItem {
  id: number;
  revenueNumber: string;
  description: string;
  amount: number;
  currency?: string;
  revenueDate: string;
  categoryName?: string;
}

export interface FinancialReportRow {
  propertyName?: string;
  year?: number;
  month?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
  cashIn?: number;
  cashOut?: number;
  ownerName?: string;
  statementMonth?: number;
  statementYear?: number;
  ownerNetAmount?: number;
}

export interface BudgetItem {
  id: number;
  propertyId?: number;
  categoryName?: string;
  budgetedAmount: number;
}

export type FinanceExportType = 'RENT_INCOME' | 'EXPENSES' | 'PAYROLL' | 'ALL';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  constructor(
    private readonly api: ApiService,
    private readonly http: HttpClient
  ) {}

  getDashboard(propertyId?: number): Observable<ApiResponse<FinanceDashboardDto>> {
    return this.api.get(AppConstants.API.FINANCE_DASHBOARD, propertyId ? { propertyId } : {});
  }

  createExpense(body: { propertyId: number; description: string; amount: number; currency?: string; expenseDate: string; categoryId?: number }): Observable<ApiResponse<ExpenseItem>> {
    return this.api.post(AppConstants.API.FINANCE_EXPENSES, body);
  }

  createRevenue(body: { propertyId: number; description: string; amount: number; currency?: string; revenueDate: string; categoryId?: number }): Observable<ApiResponse<RevenueItem>> {
    return this.api.post(AppConstants.API.FINANCE_REVENUES, body);
  }

  getExpenses(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<ExpenseItem>>> {
    return this.api.get(AppConstants.API.FINANCE_EXPENSES, params);
  }

  getRevenues(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<RevenueItem>>> {
    return this.api.get(AppConstants.API.FINANCE_REVENUES, params);
  }

  getBudgets(propertyId?: number): Observable<ApiResponse<BudgetItem[]>> {
    return this.api.get(AppConstants.API.FINANCE_BUDGETS, propertyId ? { propertyId } : {});
  }

  getPnl(propertyId?: number, yearFrom?: number, yearTo?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    const params: Record<string, number> = {};
    if (propertyId) params['propertyId'] = propertyId;
    if (yearFrom) params['yearFrom'] = yearFrom;
    if (yearTo) params['yearTo'] = yearTo;
    return this.api.get(AppConstants.API.FINANCE_REPORTS_PNL, params);
  }

  getCashflow(propertyId?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    return this.api.get(AppConstants.API.FINANCE_REPORTS_CASHFLOW, propertyId ? { propertyId } : {});
  }

  getOwnerStatements(propertyId?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    return this.api.get(AppConstants.API.FINANCE_REPORTS_OWNER_STATEMENTS, propertyId ? { propertyId } : {});
  }

  downloadCsv(from: string, to: string, type: FinanceExportType): Observable<Blob> {
    return this.http.get(this.api.buildUrl(AppConstants.API.FINANCE_EXPORT_CSV), {
      params: { from, to, type },
      responseType: 'blob'
    });
  }
}
