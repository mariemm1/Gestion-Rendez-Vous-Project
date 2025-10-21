// src/app/pages/rdv/rdv.page.ts
import { Component, OnInit, signal } from '@angular/core';                         // Importe les APIs de composant, le hook OnInit et les signals réactifs
import { CommonModule } from '@angular/common';                                    // Module Angular commun (ngIf, ngFor…)
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonSegment, IonSegmentButton,     // Composants Ionic utilisés par ce composant
  IonLabel, IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';                                               // Permet d’enregistrer des icônes Ionicons
import { calendar, checkmarkCircle, closeCircle, time } from 'ionicons/icons';    // Icônes spécifiques utilisées
import { FormsModule } from '@angular/forms';                                      // Module de formulaires (pour ngModel)

import { AuthService } from '../../services/auth/auth';                            // Service d’authentification (rôle, userId, etc.)
import { RdvService } from '../../services/rdv/rdv';                               // Service d’accès aux rendez-vous (API)
import { RendezVous } from '../../models/rendezvous/rendezvous';                   // Modèle typé d’un rendez-vous
import { ActivatedRoute } from '@angular/router';                                  // Accès aux paramètres/queries de la route
import { NotificationsService } from '../../services/notifications/notifications'; // Service de notifications (badge, marquage)
import { UiService } from '../../services/ui/ui.service';                          // Service UI (loading, toasts, alertes)

type DayGroup = [Date, RendezVous[]];                                              // Groupe de RDV par jour: [jour, liste de RDV]

@Component({
  selector: 'app-rdv',                                                             // Sélecteur du composant (pour le routing)
  templateUrl: './rdv.page.html',                                                  // Template associé
  styleUrls: ['./rdv.page.scss'],                                                  // Styles associés
  standalone: true,                                                                // Composant standalone (pas de NgModule)
  imports: [                                                                       // Modules/composants utilisés dans le template
    CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonButtons, IonButton, IonIcon, IonNote
  ],
})
export class RdvPage implements OnInit {
  role = this.auth.role;                                                           // Rôle courant (CLIENT / PROFESSIONNEL / ADMIN)
  uid  = this.auth.userId!;                                                        // Identifiant utilisateur issu du token
  segment = signal<'pending' | 'confirmed' | 'all'>('pending');                    // Onglet sélectionné (signal réactif pour PRO)

  clientList: RendezVous[] = [];                                                   // RDV du client (vue client)
  proAll: RendezVous[] = [];                                                       // Tous les RDV du pro (vue pro, onglet "all")
  proPending: RendezVous[] = [];                                                   // RDV en attente (vue pro)
  proConfirmed: RendezVous[] = [];                                                 // RDV confirmés (vue pro)
  errorMsg = '';                                                                   // Message d’erreur UI

  constructor(
    private auth: AuthService,                                                     // Injection AuthService
    private rdv: RdvService,                                                       // Injection RdvService
    private route: ActivatedRoute,                                                 // Pour lire les query params (tab)
    private ns: NotificationsService,                                              // Pour rafraîchir le badge de notifications
    private ui: UiService                                                          // UI (loader/toast/confirm)
  ) {
    addIcons({ calendar, checkmarkCircle, closeCircle, time });                    // Enregistre les icônes utilisées
  }

  ngOnInit() {                                                                     // Hook appelé à l’initialisation
    const qtab = (this.route.snapshot.queryParamMap.get('tab') || '').toLowerCase(); // Lit le paramètre de query "tab"
    if (qtab === 'pending' || qtab === 'confirmed' || qtab === 'all') this.segment.set(qtab as any); // Si valide, met à jour l’onglet

    if (this.role === 'CLIENT') this.loadClient();                                 // Charge la vue client si rôle = CLIENT
    else if (this.role === 'PROFESSIONNEL') this.loadPro();                        // Charge la vue pro si rôle = PROFESSIONNEL
  }

  // ---- CLIENT ----
  loadClient() {                                                                   // Charge les RDV du client
    this.errorMsg = '';                                                            // Reset erreurs UI
    this.rdv.getClientRdvs(this.uid).subscribe({                                   // Appelle l’API client
      next: list => { this.clientList = list || []; },                             // Alimente la liste
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',// Message d’erreur si échec
    });
  }

  async cancel(r: RendezVous) {                                                    // Annule un RDV côté client
    const ok = await this.ui.confirm(                                              // Demande confirmation
      'Annuler ce rendez-vous ?',
      `Voulez-vous annuler le RDV du ${new Date(r.date).toLocaleDateString()} à ${r.heure} ?`,
      'Annuler', 'Retour'
    );
    if (!ok) return;                                                               // Si l’utilisateur annule, on sort

    try {
      await this.ui.withLoading(                                                   // Affiche un loader pendant l’appel API
        () => this.rdv.cancel(this.uid, r._id!).toPromise(),
        'Annulation...'
      );
      await this.ui.success('Rendez-vous annulé.');                                // Toast succès
      this.loadClient();                                                           // Recharge la liste
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Impossible d’annuler';               // Message d’erreur
      await this.ui.error(this.errorMsg);                                          // Toast d’erreur
    }
  }

  async deleteCancelled(r: RendezVous) {                                           // Supprime un RDV annulé (client)
    const ok = await this.ui.confirm(                                              // Demande confirmation
      'Supprimer ce rendez-vous ?',
      'Cette action est définitive.',
      'Supprimer', 'Annuler'
    );
    if (!ok) return;                                                               // Annule si non confirmé

    try {
      await this.ui.withLoading(                                                   // Loader durant la suppression
        () => this.rdv.deleteCancelled(this.uid, r._id!).toPromise(),
        'Suppression...'
      );
      await this.ui.success('RDV supprimé.');                                      // Toast succès
      this.loadClient();                                                           // Reload liste client
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Suppression impossible';             // Message d’erreur
      await this.ui.error(this.errorMsg);                                          // Toast d’erreur
    }
  }

  // ---- PRO ----
  loadPro() {                                                                      // Charge les RDV du professionnel
    this.errorMsg = '';                                                            // Reset erreurs UI
    this.rdv.getProRdvs(this.uid).subscribe({                                      // Tous les RDV
      next: list => this.proAll = list || [],                                      // Stocke "all"
      error: err => this.errorMsg = err?.error?.message || 'Erreur chargement RDV',// Erreur éventuelle
    });
    this.rdv.getProPending(this.uid).subscribe({ next: list => this.proPending = list || [] });     // En attente
    this.rdv.getProConfirmed(this.uid).subscribe({ next: list => this.proConfirmed = list || [] }); // Confirmés
  }

  async confirm(r: RendezVous) {                                                   // Confirme un RDV (pro)
    const ok = await this.ui.confirm(                                              // Demande confirmation
      'Confirmer ce rendez-vous ?',
      `Confirmer le ${new Date(r.date).toLocaleDateString()} à ${r.heure} ?`,
      'Confirmer', 'Annuler'
    );
    if (!ok) return;                                                               // Annule si non confirmé

    try {
      await this.ui.withLoading(                                                   // Loader durant confirmation
        () => this.rdv.confirmByPro(this.uid, r._id!).toPromise(),
        'Confirmation...'
      );
      this.loadPro();                                                              // Recharge les listes pro
      this.ns.refreshUnread(this.auth.userId);                                     // Rafraîchit le badge de notifications
      await this.ui.success('Rendez-vous confirmé.');                              // Toast succès
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Confirmation impossible';            // Message d’erreur
      await this.ui.error(this.errorMsg);                                          // Toast d’erreur
    }
  }

  // Helpers
  asDate(d: string) { return new Date(d); }                                        // Convertit une chaîne de date en Date
  isPending(r: RendezVous) { return r.statut === 'En attente'; }                   // Vérifie statut "En attente"
  isConfirmed(r: RendezVous) { return r.statut === 'Confirmé'; }                   // Vérifie statut "Confirmé"
  isCancelled(r: RendezVous) { return r.statut === 'Annulé'; }                     // Vérifie statut "Annulé"

  private groupByLocalDay(list: RendezVous[]): DayGroup[] {                        // Regroupe les RDV par jour local
    const map = new Map<number, { day: Date; list: RendezVous[] }>();              // Map clé numérique (YYYYMMDD) → {day, liste}
    for (const r of list) {                                                        // Itère sur les RDV
      const d = new Date(r.date);                                                  // Crée une date
      d.setHours(0, 0, 0, 0);                                                      // Normalise à minuit
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();// Clé YYYYMMDD
      if (!map.has(key)) map.set(key, { day: new Date(d), list: [] });             // Initialise le groupe si absent
      map.get(key)!.list.push(r);                                                  // Ajoute le RDV au groupe
    }
    return Array.from(map.values())                                                // Convertit la map en tableau
      .sort((a, b) => a.day.getTime() - b.day.getTime())                           // Trie par date ascendante
      .map(v => [v.day, v.list]);                                                  // Transforme en tuple [Date, RendezVous[]]
  }

  groupsPro(): DayGroup[] { return this.groupByLocalDay(this.proAll); }            // Groupes pour la vue PRO "all"
  groupsClient(): DayGroup[] { return this.groupByLocalDay(this.clientList); }     // Groupes pour la vue CLIENT

  clientName(r: any)  { return r?.client_id?.userId?.nom || ''; }                  // Récupère le nom du client (safe access)
  clientEmail(r: any) { return r?.client_id?.userId?.email || ''; }                // Récupère l’email du client (safe access)
}
