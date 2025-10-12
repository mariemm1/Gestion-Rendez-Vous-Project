import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';

@Component({
  selector: 'app-dashboard-pro',
  templateUrl: './dashboard-pro.page.html',
  styleUrls: ['./dashboard-pro.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton],
})
export class DashboardProPage implements OnInit {
  uid = this.auth.userId || '';
  pending: any[] = [];
  confirmed: any[] = [];

  constructor(private auth: AuthService, private rdvSvc: RdvService, private router: Router) {}

  ngOnInit() {
    if (!this.uid) return; // not logged in yet
    this.rdvSvc.getProPending(this.uid).subscribe(d => (this.pending = d || []));
    this.rdvSvc.getProConfirmed(this.uid).subscribe(d => (this.confirmed = d || []));
  }

  goPending() { this.router.navigateByUrl('/pro/rdv-en-attente'); }
  goConfirmed() { this.router.navigateByUrl('/pro/rdv-confirmes'); }
}
