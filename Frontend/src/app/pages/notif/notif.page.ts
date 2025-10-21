// Frontend/src/app/pages/notif/notif.page.ts
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
import { UiService } from '../../services/ui/ui.service';

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
  items: Notification[] = [];
  errorMsg = '';
  /** Used by the template to show the “Aucune notification…” placeholder */
  loading = false;

  constructor(
    private auth: AuthService,
    private ns: NotificationsService,
    private ui: UiService
  ) {
    addIcons({ notificationsOutline, checkmarkDone, trash });
  }

  ngOnInit() { this.load(); }

  async load(event?: CustomEvent | null) {
    const uid = this.auth.userId;
    if (!uid) { event?.detail?.complete?.(); return; }

    this.loading = !event;    // tell the template we’re loading

    const work = async () => {
      const list = await this.ns.listForUser(uid).toPromise();
      this.items = list || [];
      this.ns.refreshUnread(uid);
    };

    try {
      if (!event) {
        await this.ui.withLoading(work, 'Chargement des notifications...');
      } else {
        await work();
        event.detail.complete();
      }
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Erreur de chargement';
      await this.ui.error(this.errorMsg);
      event?.detail?.complete?.();
    } finally {
      this.loading = false;   // done
    }
  }

  async markRead(n: Notification) {
    try {
      await this.ui.withLoading(
        () => this.ns.markRead(n._id, this.auth.userId).toPromise(),
        'Marquage...'
      );
      await this.ui.success('Notification marquée comme lue');
      this.load();
    } catch {
      await this.ui.error('Action impossible');
    }
  }

  async remove(n: Notification) {
    const ok = await this.ui.confirm('Supprimer cette notification ?', '', 'Supprimer', 'Annuler');
    if (!ok) return;

    try {
      await this.ui.withLoading(
        () => this.ns.delete(n._id, this.auth.userId).toPromise(),
        'Suppression...'
      );
      await this.ui.success('Notification supprimée');
      this.load();
    } catch {
      await this.ui.error('Suppression impossible');
    }
  }

  asDate(d: string) { return new Date(d); }
}
