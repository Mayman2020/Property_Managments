import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
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

@Injectable({ providedIn: 'root' })
export class FinanceService {
  constructor(private readonly api: ApiService) {}

  getDashboard(propertyId?: number): Observable<ApiResponse<FinanceDashboardDto>> {
    return this.api.get('/finance/dashboard', propertyId ? { propertyId } : {});
  }

  createExpense(body: { propertyId: number; description: string; amount: number; currency?: string; expenseDate: string; categoryId?: number }): Observable<ApiResponse<ExpenseItem>> {
    return this.api.post('/finance/expenses', body);
  }

  createRevenue(body: { propertyId: number; description: string; amount: number; currency?: string; revenueDate: string; categoryId?: number }): Observable<ApiResponse<RevenueItem>> {
    return this.api.post('/finance/revenues', body);
  }

  getExpenses(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<ExpenseItem>>> {
    return this.api.get('/finance/expenses', params);
  }

  getRevenues(params: Record<string, string | number> = {}): Observable<ApiResponse<PagedResponse<RevenueItem>>> {
    return this.api.get('/finance/revenues', params);
  }

  getBudgets(propertyId?: number): Observable<ApiResponse<BudgetItem[]>> {
    return this.api.get('/finance/budgets', propertyId ? { propertyId } : {});
  }

  getPnl(propertyId?: number, yearFrom?: number, yearTo?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    const params: Record<string, number> = {};
    if (propertyId) params['propertyId'] = propertyId;
    if (yearFrom) params['yearFrom'] = yearFrom;
    if (yearTo) params['yearTo'] = yearTo;
    return this.api.get('/finance/reports/pnl', params);
  }

  getCashflow(propertyId?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    return this.api.get('/finance/reports/cashflow', propertyId ? { propertyId } : {});
  }

  getOwnerStatements(propertyId?: number): Observable<ApiResponse<FinancialReportRow[]>> {
    return this.api.get('/finance/reports/owner-statements', propertyId ? { propertyId } : {});
  }
}
