// src/app/pages/dashboard-client/dashboard-client.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { NotificationsService } from '../../services/notifications/notifications';
import { RendezVous } from '../../models/rendezvous/rendezvous';
import { Subscription } from 'rxjs';
import { UiService } from '../../services/ui/ui.service';

@Component({
  selector: 'app-dashboard-client',
  templateUrl: './dashboard-client.page.html',
  styleUrls: ['./dashboard-client.page.scss'],
  standalone: true,
  imports: [CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, RouterLink],
})
export class DashboardClientPage implements OnInit, OnDestroy {
  name = '';
  rdv: RendezVous[] = [];     // upcoming only
  today: RendezVous[] = [];
  notif: any[] = [];

  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private rdvSvc: RdvService,
    private ns: NotificationsService,
    private ui: UiService
  ) {}

  async ngOnInit() {
    this.sub.add(this.auth.user$.subscribe(u => (this.name = u?.nom || '')));
    if (!this.name && this.auth.isLoggedIn()) {
      this.sub.add(this.auth.me().subscribe(() => this.loadData(true)));
    } else {
      this.loadData(true);
    }
  }

  private async loadData(showSpinner = false) {
    const uid = this.auth.userId;
    if (!uid) return;

    const work = async () => {
      const all = await firstValueFrom(this.rdvSvc.getClientRdvs(uid));
      const now = new Date();

      const upcoming = (all || [])
        .filter(r => {
          const dt = new Date(r.date);
          const [hh, mm] = String(r.heure || '00:00').split(':').map(Number);
          dt.setHours(hh || 0, mm || 0, 0, 0);
          return dt >= now;
        })
        .sort((a, b) => {
          const da = new Date(a.date), db = new Date(b.date);
          const [ah, am] = String(a.heure || '00:00').split(':').map(Number);
          const [bh, bm] = String(b.heure || '00:00').split(':').map(Number);
          da.setHours(ah || 0, am || 0, 0, 0);
          db.setHours(bh || 0, bm || 0, 0, 0);
          return da.getTime() - db.getTime();
        });

      this.rdv = upcoming.slice(0, 5);

      const t = new Date(); t.setHours(0, 0, 0, 0);
      this.today = (all || [])
        .filter(r => {
          const x = new Date(r.date);
          return x.getFullYear() === t.getFullYear()
              && x.getMonth() === t.getMonth()
              && x.getDate() === t.getDate();
        })
        .sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));

      const notifs = await firstValueFrom(this.ns.listForUser(uid));
      this.notif = (notifs || []).slice(0, 5);
    };

    try {
      if (showSpinner) await this.ui.withLoading(work, 'Chargement du tableau de bord...');
      else await work();
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur de chargement');
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }
}
