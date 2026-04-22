import { Component, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { LookupItem, LookupService } from '../../core/services/lookup.service';
import { SnackService } from '../../core/services/snack.service';

@Component({
  selector: 'app-lookup-management',
  standalone: true,
  imports: [
    NgFor, NgIf, DatePipe, ReactiveFormsModule, TranslateModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    PageHeaderComponent
  ],
  templateUrl: './lookup-management.component.html',
  styleUrl: './lookup-management.component.scss'
})
export class LookupManagementComponent implements OnInit {
  loading = true;
  savingCountry = false;
  savingCity = false;

  countries: LookupItem[] = [];
  filteredCountries: LookupItem[] = [];
  cities: LookupItem[] = [];
  filteredCities: LookupItem[] = [];
  countrySearch = '';
  citySearch = '';

  countryForm: FormGroup;
  cityForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly lookups: LookupService,
    private readonly snack: SnackService,
    private readonly i18n: I18nService
  ) {
    this.countryForm = this.fb.group({
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
      sortOrder: [0]
    });
  }

  ngOnInit(): void {
    this.loadCountries();
    this.cityForm.get('countryId')?.valueChanges.subscribe((countryId: number | null) => {
      if (countryId) this.loadCities(countryId);
      else this.cities = [];
    });
  }

  nameOf(item: LookupItem): string {
    return this.i18n.currentLang === 'ar' ? item.nameAr : item.nameEn;
  }

  createCountry(): void {
    if (this.countryForm.invalid || this.savingCountry) {
      this.countryForm.markAllAsTouched();
      return;
    }

    this.savingCountry = true;
    this.lookups.createCountry(this.countryForm.value).subscribe({
      next: () => {
        this.savingCountry = false;
        this.countryForm.reset({ code: '', nameAr: '', nameEn: '', sortOrder: 0 });
        this.snack.success(this.i18n.instant('LOOKUPS.COUNTRY_ADD_SUCCESS'));
        this.loadCountries();
      },
      error: (err: Error) => {
        this.savingCountry = false;
        this.snack.error(err.message || this.i18n.instant('LOOKUPS.SAVE_ERROR'));
      }
    });
  }

  createCity(): void {
    if (this.cityForm.invalid || this.savingCity) {
      this.cityForm.markAllAsTouched();
      return;
    }

    this.savingCity = true;
    this.lookups.createCity(this.cityForm.value).subscribe({
      next: () => {
        const selectedCountry = this.cityForm.get('countryId')?.value as number;
        this.savingCity = false;
        this.cityForm.reset({ countryId: selectedCountry, code: '', nameAr: '', nameEn: '', sortOrder: 0 });
        this.snack.success(this.i18n.instant('LOOKUPS.CITY_ADD_SUCCESS'));
        this.loadCities(selectedCountry);
      },
      error: (err: Error) => {
        this.savingCity = false;
        this.snack.error(err.message || this.i18n.instant('LOOKUPS.SAVE_ERROR'));
      }
    });
  }

  private loadCountries(): void {
    this.loading = true;
    this.lookups.getCountries().subscribe({
      next: (res) => {
        this.countries = res.data ?? [];
        this.applyCountrySearch();
        this.loading = false;

        const current = this.cityForm.get('countryId')?.value as number | null;
        if (!current && this.countries.length > 0) {
          this.cityForm.patchValue({ countryId: this.countries[0].id });
        }
      },
      error: () => {
        this.loading = false;
        this.countries = [];
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }

  private loadCities(countryId: number): void {
    this.lookups.getCities(countryId).subscribe({
      next: (res) => {
        this.cities = res.data ?? [];
        this.applyCitySearch();
      },
      error: () => {
        this.cities = [];
        this.snack.error(this.i18n.instant('LOOKUPS.LOAD_ERROR'));
      }
    });
  }

  onCountrySearch(value: string): void {
    this.countrySearch = value;
    this.applyCountrySearch();
  }

  onCitySearch(value: string): void {
    this.citySearch = value;
    this.applyCitySearch();
  }

  private applyCountrySearch(): void {
    const q = this.countrySearch.trim().toLowerCase();
    if (!q) {
      this.filteredCountries = [...this.countries];
      return;
    }

    this.filteredCountries = this.countries.filter((item) => {
      const text = [item.nameAr, item.nameEn, item.code].join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  private applyCitySearch(): void {
    const q = this.citySearch.trim().toLowerCase();
    if (!q) {
      this.filteredCities = [...this.cities];
      return;
    }

    this.filteredCities = this.cities.filter((item) => {
      const text = [item.nameAr, item.nameEn, item.code].join(' ').toLowerCase();
      return text.includes(q);
    });
  }
}
