// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },

  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'home',  loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
      { path: 'rdv',   loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'notif', loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },

  { path: 'admin', canActivate: [roleGuard(['ADMIN'])], loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage) },
  { path: 'pro',   canActivate: [roleGuard(['PROFESSIONNEL'])], loadComponent: () => import('./pages/pro/pro.page').then(m => m.ProPage) },

  { path: '**', redirectTo: 'login' }
];
