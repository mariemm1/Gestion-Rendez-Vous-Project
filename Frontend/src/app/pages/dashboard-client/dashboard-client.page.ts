// Importing required decorators and interfaces from Angular core
import { Component, OnInit, OnDestroy } from '@angular/core';
// Importing CommonModule for common Angular directives
import { CommonModule } from '@angular/common';
// Importing Ionic UI components for card and button layout
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/angular/standalone';
// Importing RouterLink to enable routing from template buttons
import { RouterLink } from '@angular/router';
// Importing a utility to convert Observables to Promises
import { firstValueFrom } from 'rxjs';

// Importing services used in this dashboard
import { AuthService } from '../../services/auth/auth';
import { RdvService } from '../../services/rdv/rdv';
import { NotificationsService } from '../../services/notifications/notifications';
// Importing the RendezVous model for type safety
import { RendezVous } from '../../models/rendezvous/rendezvous';
// Subscription is used to manage multiple observable subscriptions
import { Subscription } from 'rxjs';
// Importing UI service to display loading, alerts, errors, etc.
import { UiService } from '../../services/ui/ui.service';

// Component decorator defines metadata for this component
@Component({
  selector: 'app-dashboard-client', // Component selector used in routing
  templateUrl: './dashboard-client.page.html', // Template file
  styleUrls: ['./dashboard-client.page.scss'], // Style file
  standalone: true, // Standalone component (not part of a module)
  imports: [ // Importing modules and components used in the template
    CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, RouterLink
  ],
})
export class DashboardClientPage implements OnInit, OnDestroy {
  name = ''; // Holds client name for greeting
  rdv: RendezVous[] = [];     // Array of upcoming appointments
  today: RendezVous[] = [];   // Array of appointments scheduled for today
  notif: any[] = [];          // Array of last notifications

  private sub = new Subscription(); // Subscription container for automatic cleanup

  // Injecting required services through the constructor
  constructor(
    private auth: AuthService,          // Service to handle authentication and user session
    private rdvSvc: RdvService,         // Service to handle appointments (rendez-vous)
    private ns: NotificationsService,   // Service to handle notifications
    private ui: UiService               // Service for showing loading, success, or error messages
  ) {}

  // Lifecycle hook: called when the component is initialized
  async ngOnInit() {
    // Subscribe to user data to get client name dynamically
    this.sub.add(this.auth.user$.subscribe(u => (this.name = u?.nom || '')));
    // If user data not loaded yet, load it then fetch other data
    if (!this.name && this.auth.isLoggedIn()) {
      this.sub.add(this.auth.me().subscribe(() => this.loadData(true)));
    } else {
      this.loadData(true); // Load dashboard data directly
    }
  }

  // Private method to load appointments and notifications
  private async loadData(showSpinner = false) {
    const uid = this.auth.userId; // Get logged-in user ID
    if (!uid) return; // If no user ID, stop loading

    // Function to fetch and prepare dashboard data
    const work = async () => {
      // Fetch all client appointments
      const all = await firstValueFrom(this.rdvSvc.getClientRdvs(uid));
      const now = new Date(); // Current date and time

      // Filter upcoming appointments
      const upcoming = (all || [])
        .filter(r => {
          const dt = new Date(r.date); // Convert appointment date to Date object
          const [hh, mm] = String(r.heure || '00:00').split(':').map(Number); // Extract hour and minute
          dt.setHours(hh || 0, mm || 0, 0, 0); // Set time part
          return dt >= now; // Keep only future appointments
        })
        .sort((a, b) => {
          // Sort future appointments by date and time
          const da = new Date(a.date), db = new Date(b.date);
          const [ah, am] = String(a.heure || '00:00').split(':').map(Number);
          const [bh, bm] = String(b.heure || '00:00').split(':').map(Number);
          da.setHours(ah || 0, am || 0, 0, 0);
          db.setHours(bh || 0, bm || 0, 0, 0);
          return da.getTime() - db.getTime();
        });

      this.rdv = upcoming.slice(0, 5); // Take only next 5 appointments

      const t = new Date(); t.setHours(0, 0, 0, 0); // Reset time to midnight for "today"
      this.today = (all || [])
        .filter(r => {
          // Filter appointments exactly for today
          const x = new Date(r.date);
          return x.getFullYear() === t.getFullYear()
              && x.getMonth() === t.getMonth()
              && x.getDate() === t.getDate();
        })
        .sort((a, b) => (a.heure || '').localeCompare(b.heure || ''));

      // Load latest notifications
      const notifs = await firstValueFrom(this.ns.listForUser(uid));
      this.notif = (notifs || []).slice(0, 5);
    };

    try {
      // Optionally show spinner during loading
      if (showSpinner) await this.ui.withLoading(work, 'Chargement du tableau de bord...');
      else await work();
    } catch (e: any) {
      // Handle any error during loading
      await this.ui.error(e?.error?.message || 'Erreur de chargement');
    }
  }

  // Lifecycle hook: clean up subscriptions on component destroy
  ngOnDestroy() { this.sub.unsubscribe(); }
}
