// src/app/services/auth/auth.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { switchMap, tap, catchError, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { AuthTokenService } from '../auth-token/auth-token';

// ✅ Reuse your existing shared types (adjust the path if your barrel file is different)
import { User as UserProfile, UserRole, JwtClaims } from '../../models/user/user';

type LoginDto = { email: string; password: string };
type RegisterDto = {
  nom: string;
  email: string;
  pwd: string;
  role?: UserRole;
  specialite?: string; // required server-side if role === 'PROFESSIONNEL'
};
type LoginResp = { message: string; token: string };

/**
 * AuthService (Ionic standalone)
 * - Stores/reads JWT via AuthTokenService (web: localStorage; native: Capacitor Preferences)
 * - Reacts to token changes and loads /auth/me
 * - Handles token expiry
 * - Caches Client._id for CLIENT users
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl;

  /** Reactive user profile; null when logged out or not fetched. */
  private _user$ = new BehaviorSubject<UserProfile | null>(null);
  /** Public stream for templates/components. */
  readonly user$ = this._user$.asObservable();

  /** Cached Client._id (only meaningful for CLIENT role) */
  clientId?: string;

  constructor(
    private http: HttpClient,
    private tokens: AuthTokenService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    /**
     * Auto-bootstrap session on ANY token change:
     * - valid token → /auth/me → resolve clientId
     * - invalid/missing token → clear local session
     */
    this.tokens.token$
      .pipe(
        distinctUntilChanged(),
        switchMap((t) => {
          if (t && !this.tokenExpired(t)) {
            return this.me().pipe(
              tap(() => this.bootstrapClientId()),
              catchError(() => {
                this._user$.next(null);
                this.clientId = undefined;
                return of(null);
              })
            );
          } else {
            this._user$.next(null);
            this.clientId = undefined;
            return of(null);
          }
        })
      )
      .subscribe();
  }

  /** SSR-safe browser flag (kept in case you need it elsewhere). */
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /** Latest token (may be null) */
  get token(): string | null {
    return this.tokens.token;
  }

  /** True iff we currently hold a non-expired token. */
  isLoggedIn(): boolean {
    const t = this.token;
    return !!t && !this.tokenExpired(t);
  }

  /** userId from a valid token; null otherwise. */
  get userId(): string | null {
    const t = this.token;
    if (!t || this.tokenExpired(t)) return null;
    try {
      return jwtDecode<JwtClaims>(t).userId ?? null;
    } catch {
      return null;
    }
  }

  /** role from a valid token; null otherwise. */
  get role(): UserRole | null {
    const t = this.token;
    if (!t || this.tokenExpired(t)) return null;
    try {
      return jwtDecode<JwtClaims>(t).role ?? null;
    } catch {
      return null;
    }
  }

  /** Convenience for UI. */
  get displayName(): string {
    return this._user$.value?.nom || '';
  }

  /** Expiry check (seconds since epoch). Treat malformed token as expired. */
  private tokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const { exp } = jwtDecode<JwtClaims>(token);
      if (!exp) return false; // tokens without exp are treated as non-expired
      const nowSec = Math.floor(Date.now() / 1000);
      return exp <= nowSec;
    } catch {
      return true;
    }
  }

  // ======================
  // ======  API  =========
  // ======================

  /**
   * Login:
   * - Save token (AuthTokenService may be async on native)
   * - Load /auth/me
   * - Resolve clientId for CLIENT role
   */
  login(dto: LoginDto): Observable<UserProfile | null> {
    return this.http.post<LoginResp>(`${this.base}/auth/login`, dto).pipe(
      // Await potential async storage (Capacitor Preferences)
      switchMap((res) =>
        from(Promise.resolve(this.tokens.setToken(res.token))).pipe(switchMap(() => of(res)))
      ),
      switchMap(() => this.me()),
      tap(() => this.bootstrapClientId()),
      catchError((err) => {
        this._user$.next(null);
        this.clientId = undefined;
        throw err;
      })
    );
  }

  /** Register pass-through; server validates role/specialite. */
  register(dto: RegisterDto) {
    return this.http.post(`${this.base}/auth/register`, dto);
  }

  /**
   * Load current user profile (/auth/me).
   * Requires AuthInterceptor to attach Authorization header.
   */
  me(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(`${this.base}/auth/me`).pipe(
      tap((u) => this._user$.next(u)),
      catchError(() => {
        this._user$.next(null);
        this.clientId = undefined;
        return of(null);
      })
    );
  }

  /**
   * Resolve and cache Client._id for the connected CLIENT user.
   * Non-blocking; on error, clientId remains undefined.
   */
  bootstrapClientId(): void {
    if (this.role === 'CLIENT') {
      this.http.get<{ _id: string }>(`${this.base}/client/me`).subscribe({
        next: (c) => (this.clientId = c?._id),
        error: () => (this.clientId = undefined),
      });
    } else {
      this.clientId = undefined;
    }
  }


  /**
     * Update name/email and optionally password.
     * Backend route: PUT /auth/me  (requires Authorization header)
     */
  updateMe(payload: { nom?: string; email?: string; password?: string }) {
    return this.http.put<{ message: string; user: any }>(`${this.base}/auth/me`, payload).pipe(
      // keep local stream in sync
      tap(res => {
        if (res?.user) {
          this._user$.next(res.user);
        }
      })
    );
  }


  /** Clear token + local session state. */
  logout(): void {
    void this.tokens.setToken(null); // token$ will emit and clear state via the bootstrap pipeline
    this._user$.next(null);
    this.clientId = undefined;
  }


}
