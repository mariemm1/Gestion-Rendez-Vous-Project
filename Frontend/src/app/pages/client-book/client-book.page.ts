import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel,
  IonButton, IonSegment, IonSegmentButton, IonNote
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ProService } from '../../services/pro/pro';
import { RdvService } from '../../services/rdv/rdv';
import { AuthService } from '../../services/auth/auth';
import { ClientService } from '../../services/client/client';

type ComputedDispo = { date: string; heure_debut: string; heure_fin: string; step: number; freeSlots: string[] };

@Component({
  selector: 'app-client-book',
  templateUrl: './client-book.page.html',
  styleUrls: ['./client-book.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonButton, IonSegment, IonSegmentButton, IonNote
  ],
})
export class ClientBookPage {
  proUserId = '';
  days: { date: string; freeSlots: string[] }[] = [];
  selectedDay = '';
  msg = '';

  private clientId?: string;

  constructor(
    private route: ActivatedRoute,
    private proSvc: ProService,
    private rdvSvc: RdvService,
    private auth: AuthService,
    private clientSvc: ClientService,
    private router: Router
  ) {}

  ngOnInit() {
    this.proUserId = this.route.snapshot.paramMap.get('id') || '';

    // ensure Client._id
    this.clientId = this.auth.clientId;
    if (!this.clientId && this.auth.role === 'CLIENT') {
      this.clientSvc.me().subscribe({
        next: c => (this.clientId = c?._id),
        error: () => (this.msg = 'Client non trouvé')
      });
    }

    // next 30 days
    const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 30);
    const sFrom = from.toISOString().substring(0, 10);
    const sTo = to.toISOString().substring(0, 10);

    this.proSvc.getComputedDisponibilites(this.proUserId, { from: sFrom, to: sTo, step: 30 })
      .subscribe((list: ComputedDispo[]) => {
        const grouped: Record<string, Set<string>> = {};
        list.forEach(w => {
          if (!grouped[w.date]) grouped[w.date] = new Set<string>();
          w.freeSlots.forEach(s => grouped[w.date].add(s));
        });
        this.days = Object.entries(grouped).map(([date, set]) =>
          ({ date, freeSlots: Array.from(set).sort() })
        );
        this.selectedDay = this.days[0]?.date || '';
      });
  }

  slots(): string[] {
    return this.days.find(d => d.date === this.selectedDay)?.freeSlots || [];
  }

  book(heure: string) {
    const cid = this.clientId || this.auth.clientId;
    if (!cid) { this.msg = 'Client non trouvé'; return; }

    this.rdvSvc.book(cid, this.proUserId, { date: this.selectedDay, heure }).subscribe({
      next: () => { this.msg = 'Rendez-vous demandé.'; this.router.navigateByUrl('/client/rdv'); },
      error: e => this.msg = e?.error?.message || 'Erreur de réservation'
    });
  }
}
