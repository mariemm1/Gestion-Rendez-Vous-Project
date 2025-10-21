// Frontend/src/app/pages/notif/notif.page.ts

// Import Angular core symbols
import { Component, OnInit } from '@angular/core';
// Common Angular directives/pipes (e.g., *ngIf, *ngFor)
import { CommonModule } from '@angular/common';
// Import Ionic standalone components used by the page
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonChip,
  IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonNote
} from '@ionic/angular/standalone';
// Icon registration helper
import { addIcons } from 'ionicons';
// Specific Ionicons used on this page
import { notificationsOutline, checkmarkDone, trash } from 'ionicons/icons';

// Auth service to get current user id
import { AuthService } from '../../services/auth/auth';
// Service that talks to backend notifications API
import { NotificationsService } from '../../services/notifications/notifications';
// App's Notification model interface
import { Notification } from '../../models/notification/notification';
// UI helper service (loading spinner, toasts, alerts)
import { UiService } from '../../services/ui/ui.service';

// Decorator that defines this as a standalone Angular component
@Component({
  selector: 'app-notif',                              // HTML selector for this page
  templateUrl: './notif.page.html',                   // External template file
  styleUrls: ['./notif.page.scss'],                   // Styles for this page
  standalone: true,                                   // Standalone component (no NgModule)
  imports: [                                          // Standalone imports for template usage
    CommonModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonChip,
    IonIcon, IonButton, IonButtons, IonRefresher, IonRefresherContent, IonNote
  ],
})
export class NotifPage implements OnInit {
  items: Notification[] = [];                         // List of notifications to render
  errorMsg = '';                                      // Error message shown in template when non-empty
  /** Used by the template to show the “Aucune notification…” placeholder */
  loading = false;                                    // Controls "loading" placeholder state

  constructor(
    private auth: AuthService,                        // Inject auth service (for userId)
    private ns: NotificationsService,                 // Inject notifications API service
    private ui: UiService                             // Inject UI helpers (loading/toast/alert)
  ) {
    addIcons({ notificationsOutline, checkmarkDone, trash }); // Register used Ionicons
  }

  ngOnInit() { this.load(); }                         // On first load, fetch notifications

  async load(event?: CustomEvent | null) {            // Load notifications; optional refresher event
    const uid = this.auth.userId;                     // Read current user's id (from token)
    if (!uid) { event?.detail?.complete?.(); return; } // If no user, finish refresher and exit

    this.loading = !event;                            // If not pull-to-refresh, set page-level loading

    const work = async () => {                        // Core loading routine (reused with/without spinner)
      const list = await this.ns.listForUser(uid).toPromise(); // Fetch notifications for user
      this.items = list || [];                        // Store results or empty array
      this.ns.refreshUnread(uid);                     // Update unread badge elsewhere in the app
    };

    try {
      if (!event) {                                   // Normal load (no refresher): show global spinner
        await this.ui.withLoading(work, 'Chargement des notifications...');
      } else {                                        // Pull-to-refresh: no global spinner, just do work
        await work();
        event.detail.complete();                      // Tell the refresher to stop the spinner
      }
    } catch (err: any) {                              // Error path: show message + toast
      this.errorMsg = err?.error?.message || 'Erreur de chargement';
      await this.ui.error(this.errorMsg);
      event?.detail?.complete?.();                    // Always complete refresher if present
    } finally {
      this.loading = false;                           // Clear loading state
    }
  }

  async markRead(n: Notification) {                   // Mark one notification as read
    try {
      await this.ui.withLoading(                      // Show small spinner while calling API
        () => this.ns.markRead(n._id, this.auth.userId).toPromise(),
        'Marquage...'
      );
      await this.ui.success('Notification marquée comme lue'); // Toast success
      this.load();                                    // Reload list to reflect changes
    } catch {
      await this.ui.error('Action impossible');       // Toast error
    }
  }

  async remove(n: Notification) {                     // Delete one notification (with confirm)
    const ok = await this.ui.confirm('Supprimer cette notification ?', '', 'Supprimer', 'Annuler');
    if (!ok) return;                                  // If user cancels, do nothing

    try {
      await this.ui.withLoading(                      // Spinner while deleting
        () => this.ns.delete(n._id, this.auth.userId).toPromise(),
        'Suppression...'
      );
      await this.ui.success('Notification supprimée'); // Toast success
      this.load();                                    // Reload list
    } catch {
      await this.ui.error('Suppression impossible');  // Toast error
    }
  }

  asDate(d: string) { return new Date(d); }           // Helper: convert ISO string to Date for the pipe
}
