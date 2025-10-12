import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { NotificationsService } from '../../services/notifications/notifications';

@Component({
  selector: 'app-dashboard-client',
  templateUrl: './dashboard-client.page.html',
  styleUrls: ['./dashboard-client.page.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
})
export class DashboardClientPage implements OnInit {
  uid = this.auth.userId;
  name = '';         // Bonjour <name>
  rdv: any[] = [];
  notif: any[] = [];

  constructor(
    private auth: AuthService,
    private rdvSvc: RdvService,
    private ns: NotificationsService
  ) {}

  ngOnInit() {
    // Ensure user's name is available (if refreshed page)
    this.auth.user$.subscribe(u => this.name = u?.nom || '');
    if (!this.name && this.auth.isLoggedIn()) {
      this.auth.me().subscribe();
    }

    const id = this.uid!;
    this.rdvSvc.getClientRdvs(id).subscribe(d => this.rdv = d.slice(0, 5));
    this.ns.listForUser(id).subscribe(d => this.notif = d.slice(0, 5));
  }
}
