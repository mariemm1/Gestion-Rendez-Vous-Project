// src/app/guards/auth.guard.ts
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

export function roleGuard(roles: string[]): CanActivateFn {
  return (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role;
    return role && roles.includes(role) ? true : router.createUrlTree(['/tabs/home']);
  };
}
