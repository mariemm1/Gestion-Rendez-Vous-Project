// src/app/pages/client-pro-list/client-pro-list.page.ts

// Importe le décorateur de composant Angular
import { Component } from '@angular/core';
// Fournit les directives Angular de base (ngIf/ngFor, pipes, etc.)
import { CommonModule } from '@angular/common';
// Service de navigation Angular
import { Router } from '@angular/router';
// Import des composants Ionic utilisés par ce composant (mode standalone)
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonSearchbar
} from '@ionic/angular/standalone';
// Module des formulaires template-driven (pour ngModel)
import { FormsModule } from '@angular/forms';

// Service métier pour récupérer les professionnels
import { ProService } from '../../services/pro/pro';
// Service utilitaire pour toasts, spinners et confirmations
import { UiService } from '../../services/ui/ui.service';

@Component({
  selector: 'app-client-pro-list',                  // Nom du sélecteur du composant
  templateUrl: './client-pro-list.page.html',       // Chemin du template HTML
  styleUrls: ['./client-pro-list.page.scss'],       // Feuilles de style associées
  standalone: true,                                 // Composant autonome (sans NgModule)
  imports: [CommonModule, FormsModule,              // Dépendances locales du composant
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonSearchbar
  ],
})
export class ClientProListPage {
  // Tableau des pros affichés (format “public” renvoyé par l’API)
  all: Array<{ userId: string; nom: string; email: string; specialite: string }> = [];
  // Modèle du champ de recherche (lié au ion-searchbar)
  q = '';

  // Injecte les services nécessaires et lance le chargement initial
  constructor(private proSvc: ProService, private router: Router, private ui: UiService) {
    this.load();                                    // Appel initial pour récupérer la liste
  }

  // Charge la liste des pros avec un spinner et gère les erreurs
  private async load() {
    try {
      // withLoading affiche un loader pendant l’exécution de la promesse
      await this.ui.withLoading(
        () => this.proSvc.getPublic().toPromise(),  // Appel HTTP -> Observable -> Promise
        'Chargement des professionnels...'           // Message du spinner
      )
      // Une fois résolue, on met à jour l’état local
      .then(list => this.all = (list as any) || []);
    } catch (e: any) {
      // Affiche un toast d’erreur en cas d’échec
      await this.ui.error(e?.error?.message || 'Impossible de charger la liste');
    }
  }

  // Renvoie la liste filtrée selon la recherche (nom ou spécialité)
  filtered() {
    const s = (this.q || '').toLowerCase();         // Normalise la requête (minuscule)
    return this.all.filter(p =>
      (p.nom || '').toLowerCase().includes(s) ||    // Filtre sur le nom
      (p.specialite || '').toLowerCase().includes(s) // Ou sur la spécialité
    );
  }

  // Navigation vers la page de réservation pour le pro sélectionné
  open(p: { userId: string }) {
    this.router.navigate(['/client/book', p.userId]); // Construit l’URL /client/book/:id
  }
}
