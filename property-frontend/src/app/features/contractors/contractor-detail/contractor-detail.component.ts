import { Component, OnInit } from '@angular/core';
import { NgClass, NgFor, NgIf, DatePipe, DecimalPipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ContractorCompany, ContractorCompanyService, ContractorPropertyContract } from '../../../core/services/contractor-company.service';
import { CompanyOfficer } from '../../../core/services/company-staff.service';
import { DashboardService, RatingDashboardItem } from '../../../core/services/dashboard.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SnackService } from '../../../core/services/snack.service';
import { AuthService } from '../../../core/services/auth.service';
import { MaintenanceContractDialogComponent } from '../../contracts/maintenance-contract-dialog/maintenance-contract-dialog.component';
import { ContractorCompanyDialogComponent, ContractorCompanyDialogData } from '../contractor-company-dialog/contractor-company-dialog.component';

type Tab = 'info' | 'contracts' | 'staff';

@Component({
  selector: 'app-contractor-detail',
  standalone: true,
  imports: [
    NgFor, NgIf, NgClass, DecimalPipe,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './contractor-detail.component.html',
  styleUrl: './contractor-detail.component.scss'
})
export class ContractorDetailComponent implements OnInit {
  companyId!: number;
  company: ContractorCompany | null = null;
  contracts: ContractorPropertyContract[] = [];
  staff: CompanyOfficer[] = [];
  companyRatings: RatingDashboardItem[] = [];
  loading = true;
  activeTab: Tab = 'info';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly svc: ContractorCompanyService,
    private readonly dashboardSvc: DashboardService,
    private readonly dialog: MatDialog,
    private readonly snack: SnackService,
    readonly i18n: I18nService,
    readonly auth: AuthService
  ) {}

  get isArabic(): boolean { return this.i18n.currentLang === 'ar'; }

  ngOnInit(): void {
    this.companyId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      company: this.svc.getById(this.companyId).pipe(catchError(() => of(null))),
      contracts: this.svc.getMaintenanceContracts(this.companyId).pipe(catchError(() => of(null))),
      staff: this.svc.getOfficers(this.companyId).pipe(catchError(() => of(null))),
      ratings: this.dashboardSvc.getRatingsDetails().pipe(catchError(() => of(null)))
    }).subscribe(({ company, contracts, staff, ratings }) => {
      this.company = company?.data ?? null;
      this.contracts = contracts?.data ?? [];
      this.staff = staff?.data ?? [];
      this.companyRatings = (ratings?.data ?? []).filter((item) => item.contractorCompanyId === this.companyId);
      this.loading = false;
      if (!this.company) {
        this.router.navigate(['/admin/contractors']);
      }
    });
  }

  companyName(): string {
    if (!this.company) return '';
    return (this.isArabic ? this.company.nameAr : this.company.nameEn) || this.company.name || '';
  }

  get activeContractsCount(): number {
    return this.contracts.filter((contract) => contract.status === 'ACTIVE').length;
  }

  get latestContract(): ContractorPropertyContract | null {
    return this.contracts[0] ?? null;
  }

  get ratingAverage(): number {
    if (this.companyRatings.length === 0) return 0;
    const sum = this.companyRatings.reduce((total, item) => total + (item.rating || 0), 0);
    return sum / this.companyRatings.length;
  }

  get ratingPercent(): number {
    if (this.companyRatings.length === 0) return 0;
    return Math.round((this.ratingAverage / 4) * 100);
  }

  get satisfiedRatingPercent(): number {
    if (this.companyRatings.length === 0) return 0;
    const satisfied = this.companyRatings.filter((item) => item.rating >= 3).length;
    return Math.round((satisfied / this.companyRatings.length) * 100);
  }

  get latestRatings(): RatingDashboardItem[] {
    return this.companyRatings.slice(0, 3);
  }

  openEdit(): void {
    if (!this.company) return;
    this.dialog.open<ContractorCompanyDialogComponent, ContractorCompanyDialogData, boolean>(
      ContractorCompanyDialogComponent, {
        width: '560px', maxWidth: '95vw', panelClass: 'app-dialog-panel',
        data: { company: this.company, readOnly: false }
      }
    ).afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openAddContract(): void {
    this.dialog.open(MaintenanceContractDialogComponent, {
      width: '640px', maxWidth: '95vw', panelClass: 'app-dialog-panel',
      data: { contractorCompanyId: this.companyId, mode: 'create' }
    }).afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  contractStatusClass(status?: string): string {
    if (status === 'ACTIVE') return 'badge-success';
    if (status === 'DRAFT' || status === 'PENDING_OWNER_APPROVAL') return 'badge-warn';
    if (status === 'CANCELLED' || status === 'ENDED') return 'badge-muted';
    return 'badge-info';
  }

  contractStatusLabel(status?: string): string {
    if (status === 'ACTIVE') return this.i18n.instant('COMMON.ACTIVE');
    if (status === 'DRAFT') return this.i18n.instant('MAINTENANCE_CONTRACT.STATUS_DRAFT');
    if (status === 'PENDING_OWNER_APPROVAL') return this.i18n.instant('CONTRACTORS.STATUS_PENDING_OWNER_APPROVAL');
    if (status === 'CANCELLED') return this.i18n.instant('MAINTENANCE_CONTRACT.STATUS_CANCELLED');
    if (status === 'ENDED') return this.i18n.instant('MAINTENANCE_ASSIGNMENT.STATUS_ENDED');
    return status ?? '-';
  }

  propertyName(c: ContractorPropertyContract): string {
    return (this.isArabic ? c.propertyNameAr : c.propertyNameEn) || '-';
  }

  ratingTitle(item: RatingDashboardItem): string {
    return item.requestTitle?.trim() || item.requestNumber || `#${item.requestId}`;
  }

  ratingLocation(item: RatingDashboardItem): string {
    const ar = item.propertyNameAr?.trim();
    const en = item.propertyNameEn?.trim();
    const fallback = item.propertyName?.trim();
    const property = this.isArabic ? (ar || en || fallback || '-') : (en || ar || fallback || '-');
    return `${property} - ${item.unitNumber || '-'}`;
  }

  officerName(officer: CompanyOfficer): string {
    const ar = this.cleanText(officer.fullNameAr);
    const en = this.cleanText(officer.fullNameEn);
    const fallback = this.cleanText(officer.fullName);
    return this.isArabic ? (ar || en || fallback || '-') : (en || ar || fallback || '-');
  }

  officerInitial(officer: CompanyOfficer): string {
    const name = this.officerName(officer);
    return (name === '-' ? '?' : name.charAt(0)).toUpperCase();
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  goBack(): void {
    this.router.navigate(['/admin/contractors']);
  }

  private cleanText(value?: string | null): string {
    const text = value?.trim() ?? '';
    return text && !/^[?\s\uFFFD]+$/.test(text) ? text : '';
  }
}
