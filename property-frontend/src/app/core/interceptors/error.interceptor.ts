import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { TokenStorageService } from '../auth/token-storage.service';
import { AppConstants } from '../constants/app-constants';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenStorage = inject(TokenStorageService);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes(AppConstants.API.AUTH_LOGIN)) {
        tokenStorage.clearAll();
        void router.navigateByUrl('/auth/login');
      }

      const { errorCode, message: rawMsg } = readApiErrorBody(err);
      const message = translateBackendError(errorCode, rawMsg, translate);
      const normalizedError = new Error(message) as Error & { status?: number; errorCode?: string };
      normalizedError.status = err.status;
      normalizedError.errorCode = errorCode;
      return throwError(() => normalizedError);
    })
  );
};

function readApiErrorBody(err: HttpErrorResponse): { errorCode?: string; message: string } {
  const body = err.error;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    const code = (o['errorCode'] ?? o['error_code']) as string | undefined;
    const message = (o['message'] as string | undefined) ?? err.message ?? '';
    return { errorCode: typeof code === 'string' ? code : undefined, message };
  }
  if (typeof body === 'string' && body.trim()) {
    return { errorCode: undefined, message: body };
  }
  return { errorCode: undefined, message: err.message ?? '' };
}

/** ngx-translate `instant` returns the key if JSON not loaded yet (e.g. cache); never show raw keys in UI. */
function instantWithFallback(
  translate: TranslateService,
  key: string,
  params: Record<string, string | number>,
  fallbackEn: string,
  fallbackAr: string
): string {
  const t = translate.instant(key, params);
  if (t && t !== key) return t;
  const lang = translate.currentLang || translate.getDefaultLang() || 'ar';
  return lang === 'en' ? fallbackEn : fallbackAr;
}

function extractEmail(raw: string): string {
  const m = raw.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
  return m ? m[0] : '';
}

function parsePropertyUnitCapacityMax(raw: string): string {
  const fromPhrase = raw.match(/unit count \((\d+)\)/i);
  if (fromPhrase?.[1]) return fromPhrase[1];
  const tail = raw.match(/\((\d+)\)\s*\.?\s*$/);
  return tail?.[1] ?? '';
}

function translateBackendError(errorCode: string | undefined, rawMsg: string, translate: TranslateService): string {
  if (rawMsg.includes('Cannot reach backend')) return rawMsg;
  const rawKey = rawMsg?.trim();
  if (rawKey && /^[A-Z0-9_.-]+$/.test(rawKey)) {
    const fromKey = translate.instant(rawKey);
    if (fromKey && fromKey !== rawKey) return fromKey;
  }

  switch (errorCode) {
    case 'FLOOR_CAPACITY_REACHED': {
      const match = rawMsg.match(/Floor (\d+) capacity reached \((\d+) units max\)/);
      const floor = match?.[1] ?? '';
      const capacity = match?.[2] ?? '';
      const fbEn = `Floor ${floor || '?'} capacity reached (${capacity || '?'} units max).`;
      const fbAr = `وصل الطابق ${floor || '؟'} إلى الحد الأقصى (${capacity || '؟'} وحدة).`;
      return instantWithFallback(translate, 'ERRORS.FLOOR_CAPACITY_REACHED', { floor, capacity }, fbEn, fbAr);
    }
    case 'PROPERTY_UNIT_CAPACITY_REACHED': {
      const max = parsePropertyUnitCapacityMax(rawMsg);
      const fbEn = `This property has reached its maximum configured unit count (${max || '?'} units).`;
      const fbAr = `لا يمكن إضافة وحدات أخرى: وصل العقار إلى الحد الأقصى المحدد في الإعداد (${max || '—'} وحدة).`;
      return instantWithFallback(translate, 'ERRORS.PROPERTY_UNIT_CAPACITY_REACHED', { max }, fbEn, fbAr);
    }
    case 'PROPERTY_HAS_UNITS':
      return translate.instant('ERRORS.PROPERTY_HAS_UNITS');
    case 'PROPERTY_NAME_REQUIRED':
      return translate.instant('ERRORS.PROPERTY_NAME_REQUIRED');
    case 'PROPERTY_OWNER_REQUIRED':
      return translate.instant('ERRORS.PROPERTY_OWNER_REQUIRED');
    case 'PROPERTY_OWNER_ATTACHMENT_REQUIRED':
      return translate.instant('ERRORS.PROPERTY_OWNER_ATTACHMENT_REQUIRED');
    case 'UNIT_IS_RENTED':
      return translate.instant('ERRORS.UNIT_IS_RENTED');
    case 'EMAIL_ALREADY_USED': {
      const email = extractEmail(rawMsg);
      const fbEn = email
        ? `This email is already in use: ${email}`
        : 'This email is already in use.';
      const fbAr = email
        ? `هذا البريد الإلكتروني مستخدم بالفعل: ${email}`
        : 'هذا البريد الإلكتروني مستخدم بالفعل.';
      return instantWithFallback(translate, 'ERRORS.EMAIL_ALREADY_USED', { email }, fbEn, fbAr);
    }
    case 'EMAIL_USED_BY_DIFFERENT_ROLE': {
      const email = extractEmail(rawMsg);
      const fbEn = email
        ? `This email is registered to another type of account: ${email}`
        : 'This email is registered to another type of account.';
      const fbAr = email
        ? `هذا البريد الإلكتروني مسجَّل بحساب من نوع آخر: ${email}`
        : 'هذا البريد الإلكتروني مسجَّل بحساب من نوع آخر.';
      return instantWithFallback(translate, 'ERRORS.EMAIL_USED_BY_DIFFERENT_ROLE', { email }, fbEn, fbAr);
    }
    case 'FILE_TOO_LARGE':
      return translate.instant('ERRORS.FILE_TOO_LARGE');
    case 'UNSUPPORTED_FILE_TYPE':
      return translate.instant('ERRORS.UNSUPPORTED_FILE_TYPE');
    default:
      return translateKnownBackendMessage(rawMsg, translate) || localizedFallback(rawMsg, translate);
  }
}

function translateKnownBackendMessage(rawMsg: string, translate: TranslateService): string | null {
  const normalized = (rawMsg || '').trim();
  const exactMap: Record<string, string> = {
    'Property name is required in Arabic and English': 'ERRORS.PROPERTY_NAME_REQUIRED',
    'At least one owner is required': 'ERRORS.PROPERTY_OWNER_REQUIRED',
    'At least one owner ownership/license attachment is required': 'ERRORS.PROPERTY_OWNER_ATTACHMENT_REQUIRED',
    'Payment proof file is required': 'ERRORS.PAYMENT_PROOF_FILE_REQUIRED',
    'Authenticated user is required': 'ERRORS.AUTHENTICATED_USER_REQUIRED',
    'Contract must be ACTIVE': 'ERRORS.CONTRACT_MUST_BE_ACTIVE',
    'Contract duration cannot exceed 12 months': 'ERRORS.CONTRACT_DURATION_MAX_12',
    'Rejection reason is required': 'ERRORS.REJECTION_REASON_REQUIRED',
    'Amendment reason is required': 'ERRORS.AMENDMENT_REASON_REQUIRED',
    'Monthly rent must be positive': 'ERRORS.MONTHLY_RENT_POSITIVE',
    'Tenant must be assigned to a unit or a property': 'ERRORS.TENANT_ASSIGNMENT_REQUIRED',
    'Lease period (start/end) is required': 'ERRORS.LEASE_PERIOD_REQUIRED',
    'Lease end date must be on or after lease start date': 'ERRORS.LEASE_PERIOD_INVALID',
    'At least one lease contract attachment is required': 'ERRORS.LEASE_ATTACHMENT_REQUIRED',
    'Damages amount is required when damages are reported': 'ERRORS.DAMAGES_AMOUNT_REQUIRED',
    'proposedEndDate must be after proposedStartDate': 'ERRORS.RENEWAL_DATE_INVALID'
  };
  const key = exactMap[normalized];
  if (!key) return null;
  const translated = translate.instant(key);
  return translated && translated !== key ? translated : null;
}

function localizedFallback(rawMsg: string, translate: TranslateService): string {
  const msg = (rawMsg || '').trim();
  if (!msg) return translate.instant('ERRORS.GENERIC');
  const lang = translate.currentLang || translate.getDefaultLang() || 'ar';
  if (lang !== 'en' && /[A-Za-z]/.test(msg)) {
    return translate.instant('ERRORS.GENERIC');
  }
  return msg;
}
