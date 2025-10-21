// src/app/pages/dashboard-pro/dashboard-pro.page.ts

import { Component, OnInit, OnDestroy } from '@angular/core'; // Imports base Angular decorators and lifecycle hooks
import { CommonModule } from '@angular/common';                // Common directives/pipes for standalone components
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonChip } from '@ionic/angular/standalone'; // Ionic UI components (standalone)
import { Router, RouterLink } from '@angular/router';          // Router service and directive to navigate
import { AuthService } from '../../services/auth/auth';         // Authentication service (provides user/token info)
import { RdvService } from '../../services/rdv/rdv';            // Appointments (RDV) API service
import { RendezVous } from '../../models/rendezvous/rendezvous';// RDV model type
import { Subscription, firstValueFrom } from 'rxjs';            // RxJS Subscription and helper to await Observables
import { UiService } from '../../services/ui/ui.service';       // UI helpers (loading, toast, confirm)

@Component({
  selector: 'app-dashboard-pro',                                // Component selector used in templates
  templateUrl: './dashboard-pro.page.html',                     // Path to the template HTML
  styleUrls: ['./dashboard-pro.page.scss'],                     // Styles for this component
  standalone: true,                                             // Standalone component (no NgModule)
  imports: [CommonModule, RouterLink, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonChip], // Modules/components this component uses
})
export class DashboardProPage implements OnInit, OnDestroy {    // Class definition implementing lifecycle hooks
  pending: RendezVous[] = [];                                   // List of pending RDVs
  confirmed: RendezVous[] = [];                                 // List of confirmed RDVs
  today: RendezVous[] = [];                                     // RDVs scheduled for today only

  private sub = new Subscription();                             // Composite subscription for cleanup

  constructor(
    private auth: AuthService,                                  // Injects AuthService for user/role info
    private rdvSvc: RdvService,                                 // Injects RdvService for API calls
    private router: Router,                                     // Injects Router to navigate on button clicks
    private ui: UiService                                       // Injects UiService for spinner/toast
  ) {}

  ngOnInit() {                                                  // Lifecycle: component initialization
    const load = async () => {                                  // Local async function to fetch all required data
      const uid = this.auth.userId;                             // Read current userId from auth token
      if (!uid) return;                                         // Guard: stop if not logged in / no id

      await this.ui.withLoading(async () => {                   // Show a spinner while loading data
        [this.pending, this.confirmed] = await Promise.all([    // Fetch pending and confirmed RDVs concurrently
          firstValueFrom(this.rdvSvc.getProPending(uid)).then(r => r || []),   // Await pending list (fallback empty)
          firstValueFrom(this.rdvSvc.getProConfirmed(uid)).then(r => r || [])  // Await confirmed list (fallback empty)
        ]);

        const all = await firstValueFrom(this.rdvSvc.getProRdvs(uid)).then(r => r || []); // Fetch all RDVs (any status)
        const t = new Date();                                   // Today reference
        this.today = all.filter(r => {                          // Keep RDVs that happen today
          const d = new Date(r.date);                           // Convert ISO date string to Date
          return d.getFullYear() === t.getFullYear()            // Same year
              && d.getMonth() === t.getMonth()                  // Same month
              && d.getDate() === t.getDate();                   // Same day
        });
      }, 'Chargement du tableau de bord...');                   // Spinner message
    };

    if (this.auth.isLoggedIn()) {                               // Only attempt load if session looks valid
      if (this.auth.userId) load();                             // If we already have userId, load immediately
      else this.sub.add(this.auth.me().subscribe(() => load())); // Else, fetch /auth/me then load
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }                     // Cleanup all subscriptions on destroy

  goPending()   { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'pending' } }); }   // Navigate to RDV page, pending tab
  goConfirmed() { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'confirmed' } }); } // Navigate to RDV page, confirmed tab
  goAll()       { this.router.navigate(['/pro/rdv'], { queryParams: { tab: 'all' } }); }       // Navigate to RDV page, all tab
}
