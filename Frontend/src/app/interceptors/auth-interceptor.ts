// src/app/interceptors/auth-interceptor.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthTokenService } from '../services/auth-token/auth-token';

/**
 * Attaches the Bearer token to outbound HTTP calls (in the browser only).
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private tokens: AuthTokenService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.tokens.token;
      if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return next.handle(req);
  }
}
