import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton,
  IonLabel, IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendar, checkmarkCircle, closeCircle, time } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { RendezVous } from '../../models/rendezvous/rendezvous';
import { ActivatedRoute } from '@angular/router';
import { NotificationsService } from '../../services/notifications/notifications';
import { UiService } from '../../services/ui/ui.service';

type DayGroup = [Date, RendezVous[]];

@Component({
  selector: 'app-rdv',
  templateUrl: './rdv.page.html',
  styleUrls: ['./rdv.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
  ],
})
export class RdvPage implements OnInit {
  role = this.auth.role;
  uid  = this.auth.userId!;
  segment = signal<'pending' | 'confirmed' | 'all'>('pending');

  clientList: RendezVous[] = [];
  proAll: RendezVous[] = [];
  proPending: RendezVous[] = [];
  proConfirmed: RendezVous[] = [];
  errorMsg = '';

  constructor(
    private auth: AuthService,
    private rdv: RdvService,
    private route: ActivatedRoute,
    private ns: NotificationsService,
    private ui: UiService
  ) {
    addIcons({ calendar, checkmarkCircle, closeCircle, time });
  }

  ngOnInit() {
    const qtab = (this.route.snapshot.queryParamMap.get('tab') || '').toLowerCase();
    if (qtab === 'pending' || qtab === 'confirmed' || qtab === 'all') this.segment.set(qtab as any);

    if (this.role === 'CLIENT') this.loadClient();
    else if (this.role === 'PROFESSIONNEL') this.loadPro();
  }

  // ---- CLIENT ----
  loadClient() {
    this.errorMsg = '';
    this.rdv.getClientRdvs(this.uid).subscribe({
      next: list => { this.clientList = list || []; },
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',
    });
  }

  async cancel(r: RendezVous) {
    const ok = await this.ui.confirm(
      'Annuler ce rendez-vous ?',
      `Voulez-vous annuler le RDV du ${new Date(r.date).toLocaleDateString()} à ${r.heure} ?`,
      'Annuler', 'Retour'
    );
    if (!ok) return;

    try {
      await this.ui.withLoading(
        () => this.rdv.cancel(this.uid, r._id!).toPromise(),
        'Annulation...'
      );
      await this.ui.success('Rendez-vous annulé.');
      this.loadClient();
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Impossible d’annuler';
      await this.ui.error(this.errorMsg);
    }
  }

  async deleteCancelled(r: RendezVous) {
    const ok = await this.ui.confirm(
      'Supprimer ce rendez-vous ?',
      'Cette action est définitive.',
      'Supprimer', 'Annuler'
    );
    if (!ok) return;

    try {
      await this.ui.withLoading(
        () => this.rdv.deleteCancelled(this.uid, r._id!).toPromise(),
        'Suppression...'
      );
      await this.ui.success('RDV supprimé.');
      this.loadClient();
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Suppression impossible';
      await this.ui.error(this.errorMsg);
    }
  }

  // ---- PRO ----
  loadPro() {
    this.errorMsg = '';
    this.rdv.getProRdvs(this.uid).subscribe({
      next: list => this.proAll = list || [],
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',
    });
    this.rdv.getProPending(this.uid).subscribe({ next: list => this.proPending = list || [] });
    this.rdv.getProConfirmed(this.uid).subscribe({ next: list => this.proConfirmed = list || [] });
  }

  async confirm(r: RendezVous) {
    const ok = await this.ui.confirm(
      'Confirmer ce rendez-vous ?',
      `Confirmer le ${new Date(r.date).toLocaleDateString()} à ${r.heure} ?`,
      'Confirmer', 'Annuler'
    );
    if (!ok) return;

    try {
      await this.ui.withLoading(
        () => this.rdv.confirmByPro(this.uid, r._id!).toPromise(),
        'Confirmation...'
      );
      this.loadPro();
      this.ns.refreshUnread(this.auth.userId);
      await this.ui.success('Rendez-vous confirmé.');
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Confirmation impossible';
      await this.ui.error(this.errorMsg);
    }
  }

  // Helpers
  asDate(d: string) { return new Date(d); }
  isPending(r: RendezVous) { return r.statut === 'En attente'; }
  isConfirmed(r: RendezVous) { return r.statut === 'Confirmé'; }
  isCancelled(r: RendezVous) { return r.statut === 'Annulé'; }

  private groupByLocalDay(list: RendezVous[]): DayGroup[] {
    const map = new Map<number, { day: Date; list: RendezVous[] }>();
    for (const r of list) {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      if (!map.has(key)) map.set(key, { day: new Date(d), list: [] });
      map.get(key)!.list.push(r);
    }
    return Array.from(map.values())
      .sort((a, b) => a.day.getTime() - b.day.getTime())
      .map(v => [v.day, v.list]);
  }

  groupsPro(): DayGroup[] { return this.groupByLocalDay(this.proAll); }
  groupsClient(): DayGroup[] { return this.groupByLocalDay(this.clientList); }

  clientName(r: any)  { return r?.client_id?.userId?.nom || ''; }
  clientEmail(r: any) { return r?.client_id?.userId?.email || ''; }
}
