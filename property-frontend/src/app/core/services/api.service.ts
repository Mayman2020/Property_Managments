import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = this.resolveApiBase();

  constructor(private readonly http: HttpClient) {}

  private resolveApiBase(): string {
    const runtimeApi = (window as Window & { __PM_API_URL__?: string }).__PM_API_URL__;
    return (runtimeApi && runtimeApi.trim()) ? runtimeApi : environment.apiUrl;
  }

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<T>(`${this.base}${path}`, { params: httpParams });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body ?? {});
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  uploadFile(file: File): Observable<{ url: string; filename?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; data?: { url?: string; filename?: string } }>(`${this.base}/files/upload`, formData)
      .pipe(
        map((res) => {
          const data = res?.data ?? {};
          return {
            url: data.url ?? '',
            filename: data.filename
          };
        })
      );
  }
}
