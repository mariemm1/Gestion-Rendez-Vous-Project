// src/app/components/side-bar/side-bar.component.ts
import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,
  IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, calendar, notifications, people, settings, logOut, person, shieldCheckmark, search } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
import { NotificationsService } from '../../services/notifications/notifications';
import { interval, Subscription, switchMap } from 'rxjs';

type MenuItem = { label: string; icon: string; to: string };

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterOutlet,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,
    IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge
  ],
})
export class SideBarComponent implements OnInit, OnDestroy {
  role = signal(this.auth.role);
  userName = '';
  unread = signal(0);

  private poll?: Subscription;
  private unreadSub?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private ns: NotificationsService
  ) {
    addIcons({ home, calendar, notifications, people, settings, logOut, person, shieldCheckmark, search });
  }

  roleLabel = computed(() => {
    const r = this.role();
    if (r === 'ADMIN') return 'Espace Admin';
    if (r === 'PROFESSIONNEL') return 'Espace Docteur';
    return 'Espace Patient';
  });

  menuItems = computed<MenuItem[]>(() => {
    const r = this.role();
    if (r === 'ADMIN') {
      return [
        { label: 'Dashboard', icon: 'shield-checkmark', to: '/admin/dashboard' },
        { label: 'Professionnels', icon: 'people', to: '/admin/pro' },
        { label: 'Clients', icon: 'person', to: '/admin/client' },
        { label: 'Rendez-vous', icon: 'calendar', to: '/admin/rdv' },
        { label: 'Paramètres', icon: 'settings', to: '/admin/settings' },
      ];
    }
    if (r === 'PROFESSIONNEL') {
      return [
        { label: 'Dashboard', icon: 'home', to: '/pro/dashboard' },
        { label: 'Mes Rendez-vous', icon: 'calendar', to: '/pro/rdv' },
        { label: 'Mes disponibilités', icon: 'calendar', to: '/pro/dispos' },
        { label: 'Profil', icon: 'person', to: '/pro/profil' },
      ];
    }
    return [
      { label: 'Dashboard', icon: 'home', to: '/client/dashboard' },
      { label: 'Mes Rendez-vous', icon: 'calendar', to: '/client/rdv' },
      { label: 'Trouver un docteur', icon: 'people', to: '/client/pros' },
      { label: 'Profil', icon: 'person', to: '/client/profil' },
    ];
  });

  /** Route used by the bell so we stay inside the shell */
  get notifLink(): string {
    const r = this.role();
    if (r === 'PROFESSIONNEL') return '/pro/notif';
    if (r === 'CLIENT')        return '/client/notif';
    return '/admin/rdv'; // or an admin notif page if you add one
  }

  ngOnInit(): void {
    this.auth.user$.subscribe(u => (this.userName = u?.nom || ''));
    if (!this.userName && this.auth.isLoggedIn()) this.auth.me().subscribe();

    this.unreadSub = this.ns.unread$.subscribe(c => this.unread.set(c));
    this.ns.refreshUnread(this.auth.userId);

    this.poll = interval(30000)
      .pipe(switchMap(() => this.ns.listForUser(this.auth.userId || '')))
      .subscribe(list => this.unread.set((list || []).filter(n => !n.lue).length));
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
    this.unreadSub?.unsubscribe();
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  get userId(): string { return this.auth.userId || ''; }
}
