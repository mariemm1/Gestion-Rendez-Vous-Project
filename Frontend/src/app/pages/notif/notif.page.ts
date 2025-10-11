import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf, DatePipe } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButtons, IonButton, IonSpinner } from '@ionic/angular/standalone';
import { NotificationsService } from '../../services/notifications/notifications';
import { Notification } from '../../models/notification/notification';

@Component({
  selector: 'app-notif',
  templateUrl: './notif.page.html',
  styleUrls: ['./notif.page.scss'],
  standalone: true,
imports: [
    CommonModule, NgForOf, NgIf, DatePipe,
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButtons, IonButton, IonSpinner
  ],
})
export class NotifPage implements OnInit {
  items: Notification[] = [];
  loading = false;

  constructor(private ns: NotificationsService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.ns.my().subscribe({
      next: d => { this.items = d; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  markRead(n: Notification) { this.ns.markRead(n._id).subscribe(() => this.load()); }
  remove(n: Notification)   { this.ns.delete(n._id).subscribe(() => this.load()); }
}