// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },

  // (Optional) global notifications for deep links ONLY
  { path: 'notif', canActivate: [authGuard],
    loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) },

  // -------- CLIENT shell --------
  {
    path: 'client',
    canActivate: [authGuard, roleGuard(['CLIENT'])],
    loadComponent: () => import('./pages/side-bar/side-bar.component').then(m => m.SideBarComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard-client/dashboard-client.page').then(m => m.DashboardClientPage) },
      { path: 'rdv',       loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'notif',     loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) }, // ✅ nested here
      { path: 'pros',      loadComponent: () => import('./pages/client-pro-list/client-pro-list.page').then(m => m.ClientProListPage) },
      { path: 'book/:id',  loadComponent: () => import('./pages/client-book/client-book.page').then(m => m.ClientBookPage) },
      { path: 'profil',    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // -------- PRO shell --------
  {
    path: 'pro',
    canActivate: [authGuard, roleGuard(['PROFESSIONNEL'])],
    loadComponent: () => import('./pages/side-bar/side-bar.component').then(m => m.SideBarComponent),
    children: [
      { path: 'dashboard',      loadComponent: () => import('./pages/dashboard-pro/dashboard-pro.page').then(m => m.DashboardProPage) },
      { path: 'rdv',            loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'rdv-en-attente', loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'rdv-confirmes',  loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'dispos',         loadComponent: () => import('./pages/pro-dispos/pro-dispos.page').then(m => m.ProDisposPage) },
      { path: 'notif',          loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) }, 
      { path: 'profil',    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // -------- ADMIN shell (unchanged) --------
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['ADMIN'])],
    loadComponent: () => import('./pages/side-bar/side-bar.component').then(m => m.SideBarComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard-admin/dashboard-admin.page').then(m => m.DashboardAdminPage) },
      { path: 'rdv',       loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  { path: '**', redirectTo: 'login' },

];
