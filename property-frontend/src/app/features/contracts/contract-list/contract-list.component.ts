import { Component, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgFor, NgIf, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ContractFormComponent } from '../contract-form/contract-form.component';

import { I18nService } from '../../../core/i18n/i18n.service';
import { ContractSummary, ContractStatus } from '../../../core/models/contract.model';
import { ContractService } from '../../../core/services/contract.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { TablePagerComponent } from '../../../shared/components/table-pager/table-pager.component';

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    DecimalPipe,
    NgClass,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatDialogModule,
    TranslateModule,
    PageHeaderComponent,
    TablePagerComponent
  ],
  templateUrl: './contract-list.component.html',
  styleUrl: './contract-list.component.scss'
})
export class ContractListComponent implements OnInit {
  loading = true;
  contracts: ContractSummary[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;

  filterStatus = '';
  searchQuery = '';
  private readonly search$ = new Subject<void>();

  displayedColumns = ['contractNumber', 'tenant', 'unit', 'dates', 'rent', 'status', 'actions'];
  statusOptions: ContractStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED', 'SUSPENDED'];

  constructor(
    private readonly contractSvc: ContractService,
    private readonly dialog: MatDialog,
    private readonly location: Location,
    readonly i18n: I18nService
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(300),
      switchMap(() => this.buildQuery())
    ).subscribe((res) => this.handleResponse(res));

    this.loadContracts();
  }

  loadContracts(): void {
    this.loading = true;
    this.buildQuery().subscribe((res) => this.handleResponse(res));
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadContracts();
  }

  goToPage(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.loadContracts();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.loadContracts();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.search$.next();
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'chip-success',
      DRAFT: 'chip-default',
      EXPIRED: 'chip-danger',
      TERMINATED: 'chip-danger',
      RENEWED: 'chip-info',
      SUSPENDED: 'chip-warn'
    };
    return map[status] ?? 'chip-default';
  }

  getStatusCount(status: ContractStatus): number {
    return this.contracts.filter((contract) => contract.status === status).length;
  }

  openAddDialog(): void {
    this.dialog.open(ContractFormComponent, {
      width: '980px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'app-dialog-panel'
    }).afterClosed().subscribe(saved => {
      if (saved) this.loadContracts();
    });
  }

  private buildQuery() {
    const params: Record<string, string | number> = {
      page: this.pageIndex,
      size: this.pageSize
    };
    if (this.filterStatus) params['status'] = this.filterStatus;
    if (this.searchQuery) params['search'] = this.searchQuery;
    return this.contractSvc.getAll(params).pipe(catchError(() => of(null)));
  }

  private handleResponse(res: any): void {
    if (res?.data) {
      const data = res.data;
      this.contracts = data.content ?? data ?? [];
      this.totalElements = data.totalElements ?? this.contracts.length;
    }
    this.loading = false;
  }
}
