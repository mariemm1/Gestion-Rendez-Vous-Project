// src/app/services/auth/auth.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

// What backend expects:
// POST /auth/login     -> { email, password } -> { message, token }
// POST /auth/register  -> { nom, email, pwd, role?, specialite? } -> { message, user }
// GET  /auth/me        -> (Bearer token) -> user { _id, nom, email, role }

type LoginDto = { email: string; password: string };
type RegisterDto = {
  nom: string; email: string; pwd: string;
  role?: 'ADMIN' | 'CLIENT' | 'PROFESSIONNEL'; specialite?: string
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

  // Store the JWT token
  private _token$ = new BehaviorSubject<string | null>(this.readToken());
  token$ = this._token$.asObservable();

  // Store the fetched user profile (/auth/me)
  private _user$ = new BehaviorSubject<UserProfile | null>(null);
  user$ = this._user$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ---------- helpers ----------
  private get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }
  private readToken(): string | null { return this.isBrowser ? localStorage.getItem('token') : null; }
  get token(): string | null { return this._token$.value; }

  // Decode JWT fields (backend signs { userId, role })
  get userId(): string | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).userId ?? null; } catch { return null; }
  }
  get role(): UserRole | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).role ?? null; } catch { return null; }
  }

  // Convenience getters for UI
  get displayName(): string { return this._user$.value?.nom || ''; }
  isLoggedIn(): boolean { return !!this.token; }

  // ---------- API ----------
  login(dto: LoginDto) {
    return this.http.post<LoginResp>(`${this.base}/auth/login`, dto).pipe(
      tap(res => {
        if (this.isBrowser) localStorage.setItem('token', res.token);
        this._token$.next(res.token);
      }),
      // After token is stored, fetch /auth/me once to get the name/email/role
      tap(() => this.me().subscribe())
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

  logout() {
    if (this.isBrowser) localStorage.removeItem('token');
    this._token$.next(null);
    this._user$.next(null);
  }
}
