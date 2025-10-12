import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

/**
 * Holds the JWT token, reads/writes to localStorage in the browser.
 * No HttpClient. No dependency on AuthService. No circular refs.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this._token$.next(this.readToken());
  }

  private _token$ = new BehaviorSubject<string | null>(null);
  token$ = this._token$.asObservable();

  get token(): string | null {
    return this._token$.value;
  }

  setToken(token: string | null) {
    if (this.isBrowser) {
      if (token) localStorage.setItem('token', token);
      else localStorage.removeItem('token');
    }
    this._token$.next(token);
  }

  private readToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }
}
