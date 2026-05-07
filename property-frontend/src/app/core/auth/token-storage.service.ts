import { Injectable } from '@angular/core';
import { AppConstants } from '../constants/app-constants';

const TOKEN_KEY = AppConstants.PERSISTED_KEYS.ACCESS_TOKEN;
const REFRESH_KEY = AppConstants.PERSISTED_KEYS.REFRESH_TOKEN;
const USER_KEY = AppConstants.PERSISTED_KEYS.CURRENT_USER;

@Injectable({ providedIn: 'root' })
export class TokenStorageService {

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_KEY, token);
  }

  setUser(user: object): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  clearAll(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
