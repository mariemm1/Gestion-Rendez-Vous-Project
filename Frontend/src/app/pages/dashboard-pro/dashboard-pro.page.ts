// src/app/pages/dashboard-pro/dashboard-pro.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonChip } from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { RendezVous } from '../../models/rendezvous/rendezvous';
import { Subscription, firstValueFrom } from 'rxjs';
import { UiService } from '../../services/ui/ui.service';

@Component({
  selector: 'app-dashboard-pro',
  templateUrl: './dashboard-pro.page.html',
  styleUrls: ['./dashboard-pro.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonChip],
})
export class DashboardProPage implements OnInit, OnDestroy {
  pending: RendezVous[] = [];
  confirmed: RendezVous[] = [];
  today: RendezVous[] = [];

  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private rdvSvc: RdvService,
    private router: Router,
    private ui: UiService
  ) {}

  ngOnInit() {
    const load = async () => {
      const uid = this.auth.userId;
      if (!uid) return;

      await this.ui.withLoading(async () => {
        [this.pending, this.confirmed] = await Promise.all([
          firstValueFrom(this.rdvSvc.getProPending(uid)).then(r => r || []),
          firstValueFrom(this.rdvSvc.getProConfirmed(uid)).then(r => r || [])
        ]);

        const all = await firstValueFrom(this.rdvSvc.getProRdvs(uid)).then(r => r || []);
        const t = new Date();
        this.today = all.filter(r => {
          const d = new Date(r.date);
          return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
        });
      }, 'Chargement du tableau de bord...');
    };

    if (this.auth.isLoggedIn()) {
      if (this.auth.userId) load();
      else this.sub.add(this.auth.me().subscribe(() => load()));
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  goPending()   { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'pending' } }); }
  goConfirmed() { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'confirmed' } }); }
  goAll()       { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'all' } }); }
}
