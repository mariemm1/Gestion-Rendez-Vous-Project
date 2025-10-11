import { Component, OnInit } from '@angular/core';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonRefresher, IonRefresherContent,
  IonList, IonItem, IonLabel, IonButtons, IonButton, IonSpinner
} from '@ionic/angular/standalone';
import { CommonModule, DatePipe, NgForOf, NgIf } from '@angular/common';
import { RdvService } from '../../services/rdv/rdv';
import { RendezVous } from '../../models/rendezvous/rendezvous';

@Component({
  selector: 'app-rdv',
  templateUrl: './rdv.page.html',
  styleUrls: ['./rdv.page.scss'],
  standalone: true,
imports: [
    CommonModule, DatePipe, NgForOf, NgIf,
    IonContent, IonHeader, IonToolbar, IonTitle, IonRefresher, IonRefresherContent,
    IonList, IonItem, IonLabel, IonButtons, IonButton, IonSpinner
  ],
})

export class RdvPage implements OnInit {
  items: RendezVous[] = [];
  loading = false;

  constructor(private rdv: RdvService) {}

  ngOnInit() { this.load(); }

  load(ev?: CustomEvent) {
    this.loading = true;
    this.rdv.list({ mine: true }).subscribe({
      next: data => { this.items = data; this.loading = false; (ev as any)?.detail?.complete?.(); },
      error: () => { this.loading = false; (ev as any)?.detail?.complete?.(); }
    });
  }

  confirm(r: RendezVous) { this.rdv.confirm(r._id!).subscribe(() => this.load()); }
  cancel(r: RendezVous)  { this.rdv.cancel(r._id!).subscribe(() => this.load()); }
  remove(r: RendezVous)  { this.rdv.remove(r._id!).subscribe(() => this.load()); }
}