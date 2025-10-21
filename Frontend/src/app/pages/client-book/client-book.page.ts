// src/app/pages/client-book/client-book.page.ts

// Import de base d’Angular pour déclarer un composant et gérer le cycle de vie
import { Component, OnInit } from '@angular/core';
// Récupère les paramètres d’URL et permet de naviguer
import { ActivatedRoute, Router } from '@angular/router';
// Module commun pour ngIf/ngFor, pipes, etc.
import { CommonModule } from '@angular/common';
// Imports des composants Ionic utilisés dans ce composant (standalone)
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel,
  IonButton, IonSegment, IonSegmentButton, IonNote
} from '@ionic/angular/standalone';
// Module formulaire template-driven (pour ngModel)
import { FormsModule } from '@angular/forms';

// Services maison : pros, rdv, auth, client et UI (toast/loading/confirm)
import { ProService } from '../../services/pro/pro';
import { RdvService } from '../../services/rdv/rdv';
import { AuthService } from '../../services/auth/auth';
import { ClientService } from '../../services/client/client';
import { UiService } from '../../services/ui/ui.service';

// Type local représentant une fenêtre brute (une journée + début/fin)
type RawWindow = { date: string; heure_debut: string; heure_fin: string };

@Component({
  selector: 'app-client-book',                 // sélecteur du composant
  standalone: true,                            // composant autonome (pas de NgModule)
  imports: [                                   
    CommonModule, FormsModule,                 // modules Angular
    // composants Ionic utilisés dans le template
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonLabel, IonButton,
    IonSegment, IonSegmentButton, IonNote
  ],
  templateUrl: './client-book.page.html',      // template associé
  styleUrls: ['./client-book.page.scss'],      // styles associés
})
export class ClientBookPage implements OnInit {
  // userId du professionnel (passé dans l’URL)
  proUserId = '';
  // Jours disponibles avec leurs créneaux horaires normalisés (HH:00)
  days: { date: string; slots: string[] }[] = [];
  // Jour sélectionné dans le segment
  selectedDay = '';
  // Message d’erreur/information
  msg = '';

  // Identifiant du client (document Client), peut être undefined au démarrage
  private clientId?: string;
  // Ensemble des clés "date|heure" en cours de réservation (désactive le bouton)
  private busy = new Set<string>();
  // Ensemble des clés déjà réservées pendant cette session (retire du listing)
  private booked = new Set<string>();

  // Injection des services utiles
  constructor(
    private route: ActivatedRoute,  // accéder à :id de l’URL
    private proSvc: ProService,     // lire les disponibilités brutes côté pro
    private rdvSvc: RdvService,     // réserver un RDV
    private auth: AuthService,      // infos utilisateur courantes
    private clientSvc: ClientService,// récupérer l’id Client si besoin
    private router: Router,         // navigation après réservation
    private ui: UiService           // loaders / toasts / confirmations
  ) {}

  // Hook d’initialisation : charge les fenêtres et prépare l’UI
  ngOnInit() {
    // Récupère le :id (userId du pro) depuis l’URL
    this.proUserId = this.route.snapshot.paramMap.get('id') || '';

    // S’assurer qu’on connaît l’id du client connecté
    this.clientId = this.auth.clientId;
    if (!this.clientId && this.auth.role === 'CLIENT') {
      // Si non, appel /client/me pour l’obtenir
      this.clientSvc.me().subscribe({
        next: c => (this.clientId = c?._id),
        error: () => (this.msg = 'Client non trouvé'),
      });
    }

    // Fenêtre de recherche : d’aujourd’hui à +30 jours
    const today = this.toYmd(new Date());
    const to30  = this.toYmd(this.addDays(new Date(), 30));

    // Appel API (route publique que vous avez ajoutée) qui retourne les fenêtres brutes
    this.proSvc.getPublicWindows(this.proUserId, { from: today, to: to30 }).subscribe({
      // On transforme les fenêtres brutes en slots horaires par jour
      next: (wins) => this.buildFromRawWindows(wins || []),
      // Gestion d’erreur (message visible dans la page)
      error: (e) => this.msg = e?.error?.message || 'Erreur de chargement des disponibilités',
    });
  }

  /** Construit un dictionnaire jour -> liste des créneaux HH:00 à partir des fenêtres brutes */
  private buildFromRawWindows(wins: RawWindow[]) {
    // map [date] -> Set('HH:00')
    const byDay: Record<string, Set<string>> = {};
    const now = new Date();
    const todayStr = this.toYmd(now);     // ex. '2025-10-21'
    const nowHHmm = this.toHhmm(now);     // ex. '14:37'

    for (const w of wins) {
      // Convertit 'heure_debut/fin' en heures pleines : ['19:00','20:00',...]
      const slots = this.hourly(w.heure_debut, w.heure_fin);
      // Si c’est pour aujourd’hui, on ne garde que les heures encore à venir
      const keep = (w.date === todayStr) ? slots.filter(s => s > nowHHmm) : slots;

      if (!keep.length) continue;         // rien à garder → on saute
      if (!byDay[w.date]) byDay[w.date] = new Set<string>(); // init le Set si besoin
      keep.forEach(s => byDay[w.date].add(s));               // ajoute les créneaux
    }

    // Transforme le dictionnaire en tableau trié par date et slots triés
    this.days = Object.entries(byDay)
      .map(([date, set]) => ({ date, slots: Array.from(set).sort() }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sélectionne par défaut le premier jour disponible
    this.selectedDay = this.days[0]?.date || '';
  }

  // Retourne les créneaux du jour sélectionné
  slots(): string[] {
    return this.days.find(d => d.date === this.selectedDay)?.slots || [];
  }

  // Compose une clé unique par créneau
  private key(date: string, heure: string) { return `${date}|${heure}`; }

  // Désactive le bouton si en cours de réservation ou déjà réservé
  isDisabled(heure: string) {
    const k = this.key(this.selectedDay, heure);
    return this.busy.has(k) || this.booked.has(k);
  }

  // Action de réservation d’un créneau
  async book(heure: string) {
    // Détermine l’id client (cache AuthService ou via /client/me)
    const cid = this.clientId || this.auth.clientId;
    if (!cid) { this.msg = 'Client non trouvé'; return; }

    // Demande de confirmation à l’utilisateur
    const ok = await this.ui.confirm('Confirmer la réservation',
      `Réserver le ${this.selectedDay} à ${heure} ?`, 'Réserver', 'Annuler');
    if (!ok) return;

    // Empêche le double-clic sur ce créneau
    const k = this.key(this.selectedDay, heure);
    if (this.busy.has(k)) return;
    this.busy.add(k);

    try {
      // Appel API avec spinner via helper UiService.withLoading
      await this.ui.withLoading(
        () => this.rdvSvc.book(cid, this.proUserId, { date: this.selectedDay, heure }).toPromise(),
        'Réservation en cours...'
      );

      // Retire immédiatement le créneau de l’UI
      this.booked.add(k);
      const day = this.days.find(d => d.date === this.selectedDay);
      if (day) day.slots = day.slots.filter(s => s !== heure);

      // Feedback positif + navigation vers la liste des RDV
      await this.ui.success('Rendez-vous demandé.');
      this.router.navigateByUrl('/client/rdv');
    } catch (e: any) {
      // Message d’erreur toast
      await this.ui.error(e?.error?.message || 'Erreur de réservation');
    } finally {
      // Réactive le bouton pour ce créneau en cas d’erreur
      this.busy.delete(k);
    }
  }

  // --- utilities -----------------------------------------------------------

  /** Retourne les heures pleines de [start, end) sous forme 'HH:00' */
  private hourly(start: string, end: string): string[] {
    const [sh, sm] = start.split(':').map(Number);  // heures/minutes début
    const [eh, em] = end.split(':').map(Number);    // heures/minutes fin

    // On démarre à l’heure pleine suivante si minutes > 0
    let cur = sh + (sm > 0 ? 1 : 0);
    // La borne haute est exclusive (on ne prend pas le eh lui-même)
    const limit = (em > 0) ? eh : eh;

    const out: string[] = [];
    while (cur < limit) {
      out.push(`${String(cur).padStart(2, '0')}:00`);
      cur++;
    }
    // Cas simple “propre” : 19:00→21:00 => [19:00, 20:00]
    if (sm === 0 && em === 0) {
      const arr: string[] = [];
      for (let h = sh; h < eh; h++) arr.push(`${String(h).padStart(2, '0')}:00`);
      return arr;
    }
    return out;
  }

  // Formate une date JS en 'YYYY-MM-DD'
  private toYmd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // Formate une heure/minute en 'HH:MM'
  private toHhmm(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  // Ajoute n jours à une date (sans transporter l’heure courante)
  private addDays(d: Date, n: number) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
}
