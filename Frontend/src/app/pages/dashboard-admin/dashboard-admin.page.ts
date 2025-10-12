import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent } from '@ionic/angular/standalone';
import { AdminService } from '../../services/admin/admin';
import { ClientService } from '../../services/client/client';
import { ProService } from '../../services/pro/pro';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.page.html',
  styleUrls: ['./dashboard-admin.page.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
})

export class DashboardAdminPage implements OnInit {
  proCount = 0; clientCount = 0; adminCount = 0;

  constructor(private admin: AdminService, private clients: ClientService, private pros: ProService) {}

  ngOnInit() {
    this.pros.getAll().subscribe(list => this.proCount = list.length);
    this.clients.getAll().subscribe(list => this.clientCount = list.length);
    this.admin.getAll().subscribe(list => this.adminCount = list.length);
  }
}
