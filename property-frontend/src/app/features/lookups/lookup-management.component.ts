import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../core/services/lookup.service';
import { SnackService } from '../../core/services/snack.service';

type CityRow = LookupItem & { governorateNameAr: string; governorateNameEn: string };

@Component({
  selector: 'app-lookup-management',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    DatePipe,
    ReactiveFormsModule,
    TranslateModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatIconModule,
    PageHeaderComponent
  ],
  templateUrl: './lookup-management.component.html',
  styleUrl: './lookup-management.component.scss'
})
export class LookupManagementComponent implements OnInit {
  loading = true;
  savingGovernorate = false;
  savingCity = false;
  deletingLookupId: number | null = null;

  governorates: LookupItem[] = [];
  filteredGovernorates: LookupItem[] = [];
  allCities: CityRow[] = [];
  filteredCities: CityRow[] = [];

  governorateSearch = '';
  citySearch = '';
  cityGovernorateFilter: number | null = null;

  readonly pageSize = 5;
  governoratesPageIndex = 0;
  citiesPageIndex = 0;

  governorateForm: FormGroup;
  cityForm: FormGroup;

  editingGovernorateId: number | null = null;
  editingCityId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly lookups: LookupService,
    private readonly snack: SnackService,
    readonly i18n: I18nService
  ) {
    this.governorateForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      nameAr: ['', [Validators.required, Validators.maxLength(150)]],
      nameEn: ['', [Validators.required, Validators.maxLength(150)]],
      sortOrder: [0]
    });

    this.cityForm = this.fb.group({
      countryId: [null, Validators.required],
      code: ['', [Validators.required, Validators.maxLength(50)]],
      nameAr: ['', [Validators.required, Validators.maxLength(150)]],
      nameEn: ['', [Validators.required, Validators.maxLength(150)]],
      sortOrder: [0],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.loadGovernoratesAndCities();
  }

  nameOf(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  get pagedGovernorates(): LookupItem[] {
    const start = this.governoratesPageIndex * this.pageSize;
    return this.filteredGovernorates.slice(start, start + this.pageSize);
  }

  get pagedCities(): CityRow[] {
    const start = this.citiesPageIndex * this.pageSize;
    return this.filteredCities.slice(start, start + this.pageSize);
  }

  get governoratesTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGovernorates.length / this.pageSize));
  }

  get citiesTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCities.length / this.pageSize));
  }

  onGovernorateSearch(value: string): void {
    this.governorateSearch = value;
    this.applyGovernorateSearch();
    this.governoratesPageIndex = 0;
  }

  onCitySearch(value: string): void {
    this.citySearch = value;
    this.applyCitySearch();
    this.citiesPageIndex = 0;
  }

  onCityGovernorateFilter(value: number | null): void {
    this.cityGovernorateFilter = value;
    this.applyCitySearch();
    this.citiesPageIndex = 0;
  }

  changeGovernoratesPage(step: number): void {
    this.governoratesPageIndex = Math.max(0, Math.min(this.governoratesPageIndex + step, this.governoratesTotalPages - 1));
  }

  changeCitiesPage(step: number): void {
    this.citiesPageIndex = Math.max(0, Math.min(this.citiesPageIndex + step, this.citiesTotalPages - 1));
  }

  editGovernorate(item: LookupItem): void {
    this.editingGovernorateId = item.id;
    this.governorateForm.patchValue({
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      sortOrder: item.sortOrder
    });
  }

  editCity(item: CityRow): void {
    this.editingCityId = item.id;
    this.cityForm.patchValue({
      countryId: item.parentId ?? null,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      sortOrder: item.sortOrder,
      active: item.active
    });
  }

  cancelGovernorateEdit(): void {
    this.resetGovernorateForm();
  }

  cancelCityEdit(): void {
    this.resetCityForm(this.cityForm.get('countryId')?.value as number | null);
  }

  saveGovernorate(): void {
    if (this.governorateForm.invalid || this.savingGovernorate) {
      this.governorateForm.markAllAsTouched();
      return;
    }

    this.savingGovernorate = true;
    const payload = {
      code: this.governorateForm.value.code,
      nameAr: this.governorateForm.value.nameAr,
      nameEn: this.governorateForm.value.nameEn,
      sortOrder: this.governorateForm.value.sortOrder ?? 0,
      active: true
    };

    const request$ = this.editingGovernorateId
      ? this.lookups.update(this.editingGovernorateId, payload)
      : this.lookups.createCountry(payload);

    request$.subscribe({
      next: () => {
        this.savingGovernorate = false;
        this.resetGovernorateForm();
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.loadGovernoratesAndCities();
      },
      error: (err: Error) => {
        this.savingGovernorate = false;
        this.snack.error(err.message || this.i18n.instant('LOOKUPS.SAVE_ERROR'));
      }
    });
  }

  saveCity(): void {
    if (this.cityForm.invalid || this.savingCity) {
      this.cityForm.markAllAsTouched();
      return;
    }

    this.savingCity = true;
    const payload = {
      code: this.cityForm.value.code,
      nameAr: this.cityForm.value.nameAr,
      nameEn: this.cityForm.value.nameEn,
      sortOrder: this.cityForm.value.sortOrder ?? 0,
      active: this.cityForm.value.active ?? true
    };

    const request$ = this.editingCityId
      ? this.lookups.update(this.editingCityId, payload)
      : this.lookups.createCity({
          countryId: this.cityForm.value.countryId,
          code: payload.code,
          nameAr: payload.nameAr,
          nameEn: payload.nameEn,
          sortOrder: payload.sortOrder
        });

    request$.subscribe({
      next: () => {
        const selectedGovernorate = this.cityForm.get('countryId')?.value as number | null;
        this.savingCity = false;
        this.resetCityForm(selectedGovernorate);
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.loadGovernoratesAndCities();
      },
      error: (err: Error) => {
        this.savingCity = false;
        this.snack.error(err.message || this.i18n.instant('LOOKUPS.SAVE_ERROR'));
      }
    });
  }

  deleteLookup(item: LookupItem): void {
    if (item.locked || this.deletingLookupId) {
      return;
    }

    const confirmed = window.confirm(this.i18n.instant('ACTIONS.DELETE'));
    if (!confirmed) {
      return;
    }

    this.deletingLookupId = item.id;
    this.lookups.delete(item.id).subscribe({
      next: () => {
        this.deletingLookupId = null;
        this.snack.success(this.i18n.instant('COMMON.SUCCESS'));
        this.loadGovernoratesAndCities();
      },
      error: (err: Error) => {
        this.deletingLookupId = null;
        this.snack.error(err.message || this.i18n.instant('COMMON.ERROR'));
      }
    });
  }

  private loadGovernoratesAndCities(): void {
    this.loading = true;

    this.lookups.getCountries().subscribe({
      next: (res) => {
        this.governorates = res.data ?? [];
        this.applyGovernorateSearch();

        const requests = this.governorates.map((g) =>
          this.lookups.getCities(g.id).pipe(catchError(() => of({ data: [] as LookupItem[] })))
        );

        if (!requests.length) {
          this.allCities = [];
          this.filteredCities = [];
          this.loading = false;
          return;
        }

        forkJoin(requests).subscribe({
          next: (responses) => {
            const collected: CityRow[] = [];

            responses.forEach((response, index) => {
              const governorate = this.governorates[index];
              const rows = response.data ?? [];

              rows.forEach((city) => {
                collected.push({
                  ...city,
                  governorateNameAr: governorate?.nameAr ?? '',
                  governorateNameEn: governorate?.nameEn ?? ''
                });
              });
            });

            this.allCities = collected;
            this.applyCitySearch();
            this.ensureFormDefaults();
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
          }
        });
      },
      error: () => {
        this.loading = false;
        this.governorates = [];
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }

  private applyGovernorateSearch(): void {
    const q = this.governorateSearch.trim().toLowerCase();
    if (!q) {
      this.filteredGovernorates = [...this.governorates];
      return;
    }

    this.filteredGovernorates = this.governorates.filter((item) => {
      const text = [item.nameAr, item.nameEn, item.code].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  private applyCitySearch(): void {
    const q = this.citySearch.trim().toLowerCase();
    const byGovernorate = this.cityGovernorateFilter
      ? this.allCities.filter((item) => item.parentId === this.cityGovernorateFilter)
      : [...this.allCities];

    if (!q) {
      this.filteredCities = byGovernorate;
      return;
    }

    this.filteredCities = byGovernorate.filter((item) => {
      const text = [item.nameAr, item.nameEn, item.code, item.governorateNameAr, item.governorateNameEn]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }

  private ensureFormDefaults(): void {
    const current = this.cityForm.get('countryId')?.value as number | null;

    if (!current && this.governorates.length > 0) {
      const firstId = this.governorates[0].id;
      this.cityForm.patchValue({ countryId: firstId });
      if (!this.cityGovernorateFilter) {
        this.cityGovernorateFilter = firstId;
        this.applyCitySearch();
      }
    }
  }

  private resetGovernorateForm(): void {
    this.editingGovernorateId = null;
    this.governorateForm.reset({ code: '', nameAr: '', nameEn: '', sortOrder: 0 });
  }

  private resetCityForm(selectedGovernorate: number | null): void {
    this.editingCityId = null;
    this.cityForm.reset({
      countryId: selectedGovernorate,
      code: '',
      nameAr: '',
      nameEn: '',
      sortOrder: 0,
      active: true
    });
  }
}
