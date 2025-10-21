// src/app/components/side-bar/side-bar.component.ts
import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';              // Angular core APIs: component lifecycle + Signals (signal/computed)
import { Router, RouterLink, RouterOutlet } from '@angular/router';                          // Router for navigation + directives for template links/outlet
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,                   // Ionic UI primitives for header/toolbar/buttons/menu button
  IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge        // Ionic components for menu/content/list items/icons/badges
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';                                                         // Runtime registration of Ionicons
import { home, calendar, notifications, people, settings, logOut, person, shieldCheckmark, search } from 'ionicons/icons'; // Icon glyphs used
import { CommonModule } from '@angular/common';                                              // Common Angular directives (ngIf/ngFor/etc.)
import { AuthService } from '../../services/auth/auth';                                      // Auth service (role, user$, logout, etc.)
import { NotificationsService } from '../../services/notifications/notifications';           // Notifications service (list, unread$, refresh)
import { interval, Subscription, switchMap } from 'rxjs';                                    // RxJS utilities for polling/subscription

type MenuItem = { label: string; icon: string; to: string };                                 // Strongly-typed shape for menu entries

@Component({
  selector: 'app-side-bar',                                                                  // Component selector (used in templates)
  templateUrl: './side-bar.component.html',                                                  // External HTML template
  styleUrls: ['./side-bar.component.scss'],                                                  // External stylesheet
  standalone: true,                                                                          // Standalone Angular component (no NgModule needed)
  imports: [
    CommonModule, RouterLink, RouterOutlet,                                                  // Imported Angular/Ionic standalone directives/components
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,
    IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge
  ],
})
export class SideBarComponent implements OnInit, OnDestroy {                                 // Component class implementing lifecycle hooks
  role = signal(this.auth.role);                                                             // Signal holding the current role snapshot
  userName = '';                                                                             // Displayed user name in header
  unread = signal(0);                                                                        // Signal for unread notifications count

  private poll?: Subscription;                                                               // Subscription handle for polling timer
  private unreadSub?: Subscription;                                                          // Subscription handle for unread$ stream

  constructor(
    private auth: AuthService,                                                               // Inject AuthService
    private router: Router,                                                                  // Inject Router for navigation
    private ns: NotificationsService                                                         // Inject NotificationsService
  ) {
    addIcons({ home, calendar, notifications, people, settings, logOut, person, shieldCheckmark, search }); // Register icons
  }

  roleLabel = computed(() => {                                                               // Computed signal: human label for current role
    const r = this.role();                                                                   // Read current role from signal
    if (r === 'ADMIN') return 'Espace Admin';                                                // Admin label
    if (r === 'PROFESSIONNEL') return 'Espace Docteur';                                      // Pro label
    return 'Espace Patient';                                                                 // Default: client label
  });

  menuItems = computed<MenuItem[]>(() => {                                                   // Computed signal: menu items based on role
    const r = this.role();                                                                   // Read current role
    if (r === 'ADMIN') {                                                                     // Admin menu
      return [
        { label: 'Dashboard', icon: 'shield-checkmark', to: '/admin/dashboard' },
        { label: 'Professionnels', icon: 'people', to: '/admin/pro' },
        { label: 'Clients', icon: 'person', to: '/admin/client' },
        { label: 'Rendez-vous', icon: 'calendar', to: '/admin/rdv' },
        { label: 'Paramètres', icon: 'settings', to: '/admin/settings' },
      ];
    }
    if (r === 'PROFESSIONNEL') {                                                             // Pro menu
      return [
        { label: 'Dashboard', icon: 'home', to: '/pro/dashboard' },
        { label: 'Mes Rendez-vous', icon: 'calendar', to: '/pro/rdv' },
        { label: 'Mes disponibilités', icon: 'calendar', to: '/pro/dispos' },
        { label: 'Profil', icon: 'person', to: '/pro/profil' },
      ];
    }
    return [                                                                                 // Client menu
      { label: 'Dashboard', icon: 'home', to: '/client/dashboard' },
      { label: 'Mes Rendez-vous', icon: 'calendar', to: '/client/rdv' },
      { label: 'Trouver un docteur', icon: 'people', to: '/client/pros' },
      { label: 'Profil', icon: 'person', to: '/client/profil' },
    ];
  });

  /** Route used by the bell so we stay inside the shell */
  get notifLink(): string {                                                                  // Getter computing the route for the notifications page
    const r = this.role();                                                                   // Read role
    if (r === 'PROFESSIONNEL') return '/pro/notif';                                          // Pro notif route
    if (r === 'CLIENT')        return '/client/notif';                                       // Client notif route
    return '/admin/rdv'; // or an admin notif page if you add one                            // Fallback for admin
  }

  ngOnInit(): void {                                                                         // Lifecycle: component init
    this.auth.user$.subscribe(u => (this.userName = u?.nom || ''));                         // Subscribe to user stream to keep name updated
    if (!this.userName && this.auth.isLoggedIn()) this.auth.me().subscribe();               // If missing name but logged-in, fetch /auth/me

    this.unreadSub = this.ns.unread$.subscribe(c => this.unread.set(c));                    // Keep unread signal in sync with unread$ stream
    this.ns.refreshUnread(this.auth.userId);                                                // Trigger initial unread count refresh

    this.poll = interval(30000)                                                             // Set up polling every 30s
      .pipe(switchMap(() => this.ns.listForUser(this.auth.userId || '')))                   // On each tick, fetch notifications list for current user
      .subscribe(list => this.unread.set((list || []).filter(n => !n.lue).length));         // Update unread with count of not-read notifications
  }

  ngOnDestroy(): void {                                                                      // Lifecycle: component destroy
    this.poll?.unsubscribe();                                                                // Clean up polling subscription
    this.unreadSub?.unsubscribe();                                                           // Clean up unread$ subscription
  }

  logout() {                                                                                 // Logout button handler
    this.auth.logout();                                                                      // Clear token/session
    this.router.navigateByUrl('/login');                                                     // Navigate to login page
  }

  get userId(): string { return this.auth.userId || ''; }                                    // Getter exposing current userId (string or empty)
}
