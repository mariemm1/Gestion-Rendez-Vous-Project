import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public
  { path: 'login', loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage) },

  // Optional tabs (unchanged)
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'rdv',   loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'notif', loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },

  // -------- CLIENT area --------
  {
    path: 'client',
    canActivate: [authGuard, roleGuard(['CLIENT'])],
    loadComponent: () => import('./pages/side-bar/side-bar.component').then(m => m.SideBarComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard-client/dashboard-client.page').then(m => m.DashboardClientPage) },
      { path: 'rdv',       loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'notif',     loadComponent: () => import('./pages/notif/notif.page').then(m => m.NotifPage) },

      // 👇 children MUST NOT repeat "client/"
      { path: 'pros',      loadComponent: () => import('./pages/client-pro-list/client-pro-list.page').then(m => m.ClientProListPage) },
      { path: 'book/:id',  loadComponent: () => import('./pages/client-book/client-book.page').then(m => m.ClientBookPage) },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // -------- PROFESSIONNEL area --------
  {
    path: 'pro',
    canActivate: [authGuard, roleGuard(['PROFESSIONNEL'])],
    loadComponent: () => import('./pages/side-bar/side-bar.component').then(m => m.SideBarComponent),
    children: [
      { path: 'dashboard',      loadComponent: () => import('./pages/dashboard-pro/dashboard-pro.page').then(m => m.DashboardProPage) },
      { path: 'rdv',            loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'rdv-en-attente', loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },
      { path: 'rdv-confirmes',  loadComponent: () => import('./pages/rdv/rdv.page').then(m => m.RdvPage) },

      // 👇 use the same segment you navigate to
      { path: 'dispos',         loadComponent: () => import('./pages/pro-dispos/pro-dispos.page').then(m => m.ProDisposPage) },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  },

  // -------- ADMIN area --------
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

  // (Optional direct paths – keep only if you still use them elsewhere)
  { path: 'dashboard-client', loadComponent: () => import('./pages/dashboard-client/dashboard-client.page').then(m => m.DashboardClientPage) },
  { path: 'dashboard-pro',    loadComponent: () => import('./pages/dashboard-pro/dashboard-pro.page').then(m => m.DashboardProPage) },
  { path: 'dashboard-admin',  loadComponent: () => import('./pages/dashboard-admin/dashboard-admin.page').then(m => m.DashboardAdminPage) },

  // ❌ remove the extra top-level duplicates; they caused confusion
  // { path: 'pro-dispos', ... }
  // { path: 'client-pro-list', ... }
  // { path: 'client-book', ... }

  { path: '**', redirectTo: 'login' },
];
