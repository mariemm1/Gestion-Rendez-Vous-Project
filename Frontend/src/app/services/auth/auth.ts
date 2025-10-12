// src/app/services/auth/auth.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';
import { AuthTokenService } from '../auth-token/auth-token';

type LoginDto = { email: string; password: string };
type RegisterDto = {
  nom: string; email: string; pwd: string;
  role?: 'ADMIN' | 'CLIENT' | 'PROFESSIONNEL'; specialite?: string;
};
type LoginResp = { message: string; token: string };

export type UserRole = 'ADMIN' | 'CLIENT' | 'PROFESSIONNEL';
export interface UserProfile {
  _id: string; nom: string; email: string; role: UserRole;
  createdAt?: string; updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl;

  // User profile (/auth/me)
  private _user$ = new BehaviorSubject<UserProfile | null>(null);
  user$ = this._user$.asObservable();

  // Cached Client._id (only for CLIENT role)
  clientId?: string;

  constructor(
    private http: HttpClient,
    private tokens: AuthTokenService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // If a token exists on reload, fetch user and try to resolve clientId.
    if (this.token) {
      this.me().subscribe(() => this.bootstrapClientId());
    }
  }

  // -------- Helpers --------
  private get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  get token(): string | null { return this.tokens.token; }

  get userId(): string | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).userId ?? null; } catch { return null; }
  }

  get role(): UserRole | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).role ?? null; } catch { return null; }
  }

  get displayName(): string { return this._user$.value?.nom || ''; }
  isLoggedIn(): boolean { return !!this.token; }

  // -------- API --------
  login(dto: LoginDto) {
    return this.http.post<LoginResp>(`${this.base}/auth/login`, dto).pipe(
      tap(res => this.tokens.setToken(res.token)),
      tap(() => this.me().subscribe(() => this.bootstrapClientId()))
    );
  }

  register(dto: RegisterDto) {
    return this.http.post(`${this.base}/auth/register`, dto);
  }

  // Fetch user profile (needs Bearer token via interceptor)
  me() {
    return this.http.get<UserProfile>(`${this.base}/auth/me`).pipe(
      tap(u => this._user$.next(u))
    );
  }

  // Resolve Client._id for the logged-in CLIENT user without depending on ClientService
  bootstrapClientId() {
    if (this.role === 'CLIENT') {
      this.http.get<{ _id: string }>(`${this.base}/client/me`).subscribe({
        next: c => (this.clientId = c?._id),
        error: () => (this.clientId = undefined),
      });
    } else {
      this.clientId = undefined;
    }
  }

  logout() {
    this.tokens.setToken(null);
    this._user$.next(null);
    this.clientId = undefined;
  }
}
