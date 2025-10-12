import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton,
  IonLabel, IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendar, checkmarkCircle, closeCircle, time } from 'ionicons/icons';

import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { RendezVous } from '../../models/rendezvous/rendezvous';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-rdv',
  templateUrl: './rdv.page.html',
  styleUrls: ['./rdv.page.scss'],
  standalone: true,
  imports: [
    CommonModule,FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
  ],

})

export class RdvPage implements OnInit {
  role = this.auth.role;                   // 'CLIENT' | 'PROFESSIONNEL' | 'ADMIN'
  uid = this.auth.userId!;
  segment = signal<'pending'|'confirmed'|'all'>('pending');

  clientList: RendezVous[] = [];
  proAll: RendezVous[] = [];
  proPending: RendezVous[] = [];
  proConfirmed: RendezVous[] = [];
  errorMsg = '';

  constructor(private auth: AuthService, private rdv: RdvService) {
    addIcons({ calendar, checkmarkCircle, closeCircle, time });
  }

  ngOnInit() {
    if (this.role === 'CLIENT') {
      this.loadClient();
    } else if (this.role === 'PROFESSIONNEL') {
      this.loadPro();
    }
  }

  // ---------------- CLIENT ----------------
  loadClient() {
    this.errorMsg = '';
    this.rdv.getClientRdvs(this.uid).subscribe({
      next: list => { this.clientList = list; },
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',
    });
  }

  cancel(r: RendezVous) {
    // Only client can cancel his own RDV
    this.rdv.cancel(this.uid, r._id!).subscribe({
      next: () => this.loadClient(),
      error: err => this.errorMsg = err?.error?.message || 'Impossible d’annuler',
    });
  }

  deleteCancelled(r: RendezVous) {
    // Backend allows DELETE only if statut === "Annulé"
    this.rdv.deleteCancelled(this.uid, r._id!).subscribe({
      next: () => this.loadClient(),
      error: err => this.errorMsg = err?.error?.message || 'Suppression impossible',
    });
  }

  // ---------------- PRO ----------------
  loadPro() {
    this.errorMsg = '';
    this.rdv.getProRdvs(this.uid).subscribe({
      next: list => this.proAll = list,
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',
    });
    this.rdv.getProPending(this.uid).subscribe({
      next: list => this.proPending = list,
      error: () => {},
    });
    this.rdv.getProConfirmed(this.uid).subscribe({
      next: list => this.proConfirmed = list,
      error: () => {},
    });
  }

  confirm(r: RendezVous) {
    this.rdv.confirmByPro(this.uid, r._id!).subscribe({
      next: () => this.loadPro(),
      error: err => this.errorMsg = err?.error?.message || 'Confirmation impossible',
    });
  }

  // helpers
  asDate(d: string) { return new Date(d); }
  isPending(r: RendezVous) { return r.statut === 'En attente'; }
  isConfirmed(r: RendezVous) { return r.statut === 'Confirmé'; }
  isCancelled(r: RendezVous) { return r.statut === 'Annulé'; }
}