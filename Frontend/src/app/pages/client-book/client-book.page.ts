import { Component, OnInit } from '@angular/core';
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
import { UiService } from '../../services/ui/ui.service';

type RawWindow = { date: string; heure_debut: string; heure_fin: string };

@Component({
  selector: 'app-client-book',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonButton,
    IonSegment, IonSegmentButton, IonNote
  ],
  templateUrl: './client-book.page.html',
  styleUrls: ['./client-book.page.scss'],
})
export class ClientBookPage implements OnInit {
  proUserId = '';
  days: { date: string; slots: string[] }[] = [];
  selectedDay = '';
  msg = '';

  private clientId?: string;
  private busy = new Set<string>();
  private booked = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private proSvc: ProService,
    private rdvSvc: RdvService,
    private auth: AuthService,
    private clientSvc: ClientService,
    private router: Router,
    private ui: UiService
  ) {}

  ngOnInit() {
    this.proUserId = this.route.snapshot.paramMap.get('id') || '';

    // ensure we have clientId
    this.clientId = this.auth.clientId;
    if (!this.clientId && this.auth.role === 'CLIENT') {
      this.clientSvc.me().subscribe({
        next: c => (this.clientId = c?._id),
        error: () => (this.msg = 'Client non trouvé'),
      });
    }

    const today = this.toYmd(new Date());
    const to30  = this.toYmd(this.addDays(new Date(), 30));

    this.proSvc.getPublicWindows(this.proUserId, { from: today, to: to30 }).subscribe({
      next: (wins) => this.buildFromRawWindows(wins || []),
      error: (e) => this.msg = e?.error?.message || 'Erreur de chargement des disponibilités',
    });
  }

  /** Build day -> list of HH:00 slots from raw windows */
  private buildFromRawWindows(wins: RawWindow[]) {
    const byDay: Record<string, Set<string>> = {};
    const now = new Date();
    const todayStr = this.toYmd(now);
    const nowHHmm = this.toHhmm(now);

    for (const w of wins) {
      const slots = this.hourly(w.heure_debut, w.heure_fin);   // e.g. ['19:00','20:00']
      const keep = (w.date === todayStr) ? slots.filter(s => s > nowHHmm) : slots;

      if (!keep.length) continue;
      if (!byDay[w.date]) byDay[w.date] = new Set<string>();
      keep.forEach(s => byDay[w.date].add(s));
    }

    this.days = Object.entries(byDay)
      .map(([date, set]) => ({ date, slots: Array.from(set).sort() }))
      .sort((a, b) => a.date.localeCompare(b.date));

    this.selectedDay = this.days[0]?.date || '';
  }

  slots(): string[] {
    return this.days.find(d => d.date === this.selectedDay)?.slots || [];
  }

  private key(date: string, heure: string) { return `${date}|${heure}`; }
  isDisabled(heure: string) {
    const k = this.key(this.selectedDay, heure);
    return this.busy.has(k) || this.booked.has(k);
  }

  async book(heure: string) {
    const cid = this.clientId || this.auth.clientId;
    if (!cid) { this.msg = 'Client non trouvé'; return; }

    const ok = await this.ui.confirm('Confirmer la réservation',
      `Réserver le ${this.selectedDay} à ${heure} ?`, 'Réserver', 'Annuler');
    if (!ok) return;

    const k = this.key(this.selectedDay, heure);
    if (this.busy.has(k)) return;
    this.busy.add(k);

    try {
      await this.ui.withLoading(
        () => this.rdvSvc.book(cid, this.proUserId, { date: this.selectedDay, heure }).toPromise(),
        'Réservation en cours...'
      );

      // remove slot from UI
      this.booked.add(k);
      const day = this.days.find(d => d.date === this.selectedDay);
      if (day) day.slots = day.slots.filter(s => s !== heure);

      await this.ui.success('Rendez-vous demandé.');
      this.router.navigateByUrl('/client/rdv');
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur de réservation');
    } finally {
      this.busy.delete(k);
    }
  }

  // --- utilities -----------------------------------------------------------

  /** Return full-hour labels in [start, end) like '19:00', '20:00' */
  private hourly(start: string, end: string): string[] {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    // normalize bounds to full hours
    let cur = sh + (sm > 0 ? 1 : 0);
    const limit = (em > 0) ? eh : eh; // end is exclusive

    const out: string[] = [];
    while (cur < limit) {
      out.push(`${String(cur).padStart(2, '0')}:00`);
      cur++;
    }
    // Handle clean window like 19:00→21:00 => [19:00,20:00]
    if (sm === 0 && em === 0) {
      const arr: string[] = [];
      for (let h = sh; h < eh; h++) arr.push(`${String(h).padStart(2, '0')}:00`);
      return arr;
    }
    return out;
  }

  private toYmd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private toHhmm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private addDays(d: Date, n: number) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
}
