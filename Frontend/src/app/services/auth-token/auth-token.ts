// src/app/services/auth-token/auth-token.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly isBrowser: boolean;
  private readonly isNative: boolean;

  /** Reactive token stream (null when logged out) */
  private _token$ = new BehaviorSubject<string | null>(null);
  /** Subscribe to react to login/logout/token restore */
  readonly token$ = this._token$.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Capacitor v6: isNativePlatform(); v5 fallback: getPlatform() !== 'web'
    this.isNative =
      (Capacitor as any).isNativePlatform
        ? Capacitor.isNativePlatform()
        : Capacitor.getPlatform() !== 'web';

    // Fire-and-forget init (reads token from storage)
    void this.init();
  }

  /** Latest token snapshot (may be null) */
  get token(): string | null {
    return this._token$.value;
  }

  /**
   * Persist or clear the token and notify subscribers.
   * Native → Capacitor Preferences, Web → localStorage.
   */
  async setToken(token: string | null): Promise<void> {
    try {
      if (this.isNative) {
        if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
        else await Preferences.remove({ key: TOKEN_KEY });
      } else if (this.isBrowser) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      }
      this._token$.next(token);
    } catch {
      // Storage failures shouldn’t break the app; still update stream
      this._token$.next(token);
    }
  }

  // ----------------- private helpers -----------------

  /** Read token from storage once at startup and emit it */
  private async init(): Promise<void> {
    try {
      const token = await this.readToken();
      this._token$.next(token);
    } catch {
      this._token$.next(null);
    }
  }

  /** Read token from the appropriate storage */
  private async readToken(): Promise<string | null> {
    if (this.isNative) {
      const { value } = await Preferences.get({ key: TOKEN_KEY });
      return value ?? null;
    }
    return this.isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  }
}
