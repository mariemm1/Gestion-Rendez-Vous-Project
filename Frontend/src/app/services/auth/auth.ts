import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { jwtDecode } from 'jwt-decode';

// BACKEND CONTRACT:
// POST /auth/login  body: { email, password }  -> { message, token }
// POST /auth/register body: { nom, email, pwd, role?, specialite? } -> { message, user }

type LoginDto = { email: string; password: string };
type RegisterDto = { nom: string; email: string; pwd: string; role?: 'ADMIN' | 'CLIENT' | 'PROFESSIONNEL'; specialite?: string };
type LoginResp = { message: string; token: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl;

  // We only store the token, since backend doesn't return a full user object
  private _token$ = new BehaviorSubject<string | null>(this.readToken());
  token$ = this._token$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private readToken(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  get token(): string | null {
    return this._token$.value;
  }

  // Values decoded from JWT (your backend signs { userId, role })
  get userId(): string | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).userId ?? null; } catch { return null; }
  }
  get role(): 'ADMIN' | 'CLIENT' | 'PROFESSIONNEL' | null {
    if (!this.token) return null;
    try { return (jwtDecode(this.token) as any).role ?? null; } catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  login(dto: LoginDto) {
    // IMPORTANT: backend expects 'password', not 'pwd'
    return this.http.post<LoginResp>(`${this.base}/auth/login`, dto).pipe(
      tap(res => {
        if (this.isBrowser) localStorage.setItem('token', res.token);
        this._token$.next(res.token);
      })
    );
  }

  register(dto: RegisterDto) {
    // For role=PROFESSIONNEL, backend also expects 'specialite'
    return this.http.post(`${this.base}/auth/register`, dto);
  }

  logout() {
    if (this.isBrowser) localStorage.removeItem('token');
    this._token$.next(null);
  }
}
