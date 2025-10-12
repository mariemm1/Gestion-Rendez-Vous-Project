import { Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  IonApp, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,
  IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, calendar, notifications, people, settings, logOut, person, shieldCheckmark } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
// ⬇️ make sure this import matches your file name:
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
    IonApp, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,
    IonContent, IonMenu, IonList, IonItem, IonLabel, IonIcon, IonMenuToggle, IonBadge
  ],
})
export class SideBarComponent implements OnInit, OnDestroy {
  role = signal(this.auth.role);
  userName = '';
  unread = signal(0);
  private poll?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private ns: NotificationsService
  ) {
    addIcons({ home, calendar, notifications, people, settings, logOut, person, shieldCheckmark });
  }

  title = computed(() => {
    const r = this.role();
    if (r === 'ADMIN') return 'Admin Panel';
    if (r === 'PROFESSIONNEL') return 'Pro Panel';
    return 'Client Panel';
  });
  header = computed(() => `${this.title()} — Gestion RDV`);

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
      { label: 'En attente', icon: 'notifications', to: '/pro/rdv-en-attente' },
      { label: 'Confirmés', icon: 'calendar', to: '/pro/rdv-confirmes' },
      { label: 'Mes disponibilités', icon: 'calendar', to: '/pro/dispos' },
      { label: 'Profil', icon: 'person', to: '/pro/profil' },
    ];
  }
  // CLIENT
  return [
    { label: 'Dashboard', icon: 'home', to: '/client/dashboard' },
    { label: 'Mes Rendez-vous', icon: 'calendar', to: '/client/rdv' },
    { label: 'Notifications', icon: 'notifications', to: '/client/notif' },
    { label: 'Trouver un professionnel', icon: 'people', to: '/client/pros' },
    { label: 'Profil', icon: 'person', to: '/client/profil' },
  ];
});
  notifLink = computed(() => {
    const r = this.role();
    if (r === 'ADMIN') return '/admin/rdv';
    if (r === 'PROFESSIONNEL') return '/pro/rdv-en-attente';
    return '/client/notif';
  });

  ngOnInit(): void {
    // greeting
    this.auth.user$.subscribe(u => (this.userName = u?.nom || ''));
    if (!this.userName && this.auth.isLoggedIn()) this.auth.me().subscribe();

    // unread
    this.refreshUnread();
    this.poll = interval(30000)
      .pipe(switchMap(() => this.ns.listForUser(this.auth.userId || '')))
      .subscribe(list => {
        if (Array.isArray(list)) this.unread.set(list.filter(n => !n.lue).length);
      });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  private refreshUnread(): void {
    const uid = this.auth.userId;
    if (!uid) return;
    this.ns.listForUser(uid).subscribe(list => {
      this.unread.set((list || []).filter(n => !n.lue).length);
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
