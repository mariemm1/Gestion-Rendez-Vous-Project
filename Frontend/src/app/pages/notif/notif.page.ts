import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonChip,
  IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, checkmarkDone, trash } from 'ionicons/icons';
import { AuthService } from '../../services/auth/auth';
import { NotificationsService } from '../../services/notifications/notifications';
import { Notification } from '../../models/notification/notification';

@Component({
  selector: 'app-notif',
  templateUrl: './notif.page.html',
  styleUrls: ['./notif.page.scss'],
  standalone: true,
imports: [
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonChip,
    IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonNote
  ],
})
export class NotifPage implements OnInit {
  loading = false;
  items: Notification[] = [];
  errorMsg = '';

  constructor(
    private auth: AuthService,
    private ns: NotificationsService,
  ) { addIcons({ notificationsOutline, checkmarkDone, trash }); }

  ngOnInit() { this.load(); }

  load(event?: CustomEvent) {
    this.loading = !event;
    this.errorMsg = '';
    const uid = this.auth.userId!;
    this.ns.listForUser(uid).subscribe({
      next: list => { this.items = list; this.loading = false; event?.detail.complete(); },
      error: err => { this.errorMsg = err?.error?.message || 'Erreur de chargement'; this.loading = false; event?.detail.complete(); }
    });
  }

  markRead(n: Notification) {
    this.ns.markRead(n._id).subscribe(() => this.load());
  }

  remove(n: Notification) {
    this.ns.delete(n._id).subscribe(() => this.load());
  }

  asDate(d: string) { return new Date(d); }
}