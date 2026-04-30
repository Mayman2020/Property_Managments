import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { PageHeaderComponent, BreadcrumbItem } from '../../shared/components/page-header/page-header.component';
import { VacancyInquiryItem, VacancyItem, VacancyService } from '../../core/services/vacancy.service';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-vacancy-workspace',
  standalone: true,
  imports: [NgIf, NgFor, TranslateModule, MatIconModule, PageHeaderComponent],
  templateUrl: './vacancy-workspace.component.html',
  styleUrl: './vacancy-workspace.component.scss'
})
export class VacancyWorkspaceComponent implements OnInit {
  section = 'list';
  listings: VacancyItem[] = [];
  inquiries: VacancyInquiryItem[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: VacancyService,
    private readonly translate: TranslateService,
    readonly i18n: I18nService
  ) {}

  get title(): string {
    return this.section === 'inquiries'
      ? this.translate.instant('VACANCIES.INQUIRIES_TITLE')
      : this.translate.instant('VACANCIES.LISTINGS_TITLE');
  }

  get subtitle(): string {
    return this.translate.instant('VACANCIES.SUBTITLE');
  }

  get isArabic(): boolean {
    return this.i18n.currentLang === 'ar';
  }

  get breadcrumbs(): BreadcrumbItem[] {
    return [
      { label: this.translate.instant('NAV.DASHBOARD'), route: '/admin/dashboard' },
      { label: this.translate.instant('NAV.VACANCIES'), route: '/admin/vacancies/list' },
      { label: this.title }
    ];
  }

  ngOnInit(): void {
    this.section = this.route.snapshot.data['section'] ?? 'list';
    if (this.section === 'list') {
      this.service.getListings({ page: 0, size: 50 }).subscribe({
        next: (res) => { this.listings = res.data?.content ?? []; },
        error: () => { this.listings = []; }
      });
      return;
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.service.getInquiries(id).subscribe({
        next: (res) => { this.inquiries = res.data ?? []; },
        error: () => { this.inquiries = []; }
      });
    }
  }
}
