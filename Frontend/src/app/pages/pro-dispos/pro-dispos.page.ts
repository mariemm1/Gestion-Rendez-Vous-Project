// src/app/pages/pro-dispos/pro-dispos.page.ts

import { Component } from '@angular/core';                          // Import Angular component decorator
import { CommonModule } from '@angular/common';                     // Common directives/pipes (*ngIf, *ngFor, etc.)
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput,
  IonButton, IonList, IonNote
} from '@ionic/angular/standalone';                                 // Import Ionic standalone UI components
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; // Reactive forms utilities
import { ProService } from '../../services/pro/pro';                // Service to call pro availability endpoints
import { UiService } from '../../services/ui/ui.service';           // Service for loading/toast/alert helpers

@Component({
  selector: 'app-pro-dispos',                                       // Component selector (used in templates)
  templateUrl: './pro-dispos.page.html',                            // External HTML template
  styleUrls: ['./pro-dispos.page.scss'],                            // Component styles
  standalone: true,                                                 // Standalone component (no NgModule)
  imports: [                                                        // Standalone imports for template usage
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonLabel, IonInput, IonButton, IonList, IonNote
  ],
})
export class ProDisposPage {
  msg = '';                                                         // Optional message area (info/errors)
  list: { _id: string; date: string; heure_debut: string; heure_fin: string }[] = []; // Displayed availability list

  form = this.fb.group({                                            // Reactive form group
    date: ['', Validators.required],        // YYYY-MM-DD            // Date input (required)
    heure_debut: ['', Validators.required], // HH:mm                 // Start time (required)
    heure_fin: ['', Validators.required],   // HH:mm                 // End time (required)
  });

  constructor(
    private fb: FormBuilder,                                        // Build the form
    private proSvc: ProService,                                     // API calls for pro availability
    private ui: UiService                                           // UI helpers (spinner/toasts)
  ) { this.reload(); }                                              // Immediately load existing availabilities

  reload() {                                                        // Refresh availability list from server
    this.proSvc.getMyDisponibilites().subscribe(wins => {           // Call backend for my windows
      this.list = (wins || []).map(w => ({                          // Normalize and map to display format
        _id: w._id,                                                 // Keep server id (for deletion)
        date: new Date(w.date).toISOString().substring(0, 10),      // Format date as YYYY-MM-DD
        heure_debut: w.heure_debut,                                 // Keep start time
        heure_fin: w.heure_fin,                                     // Keep end time
      }));
    });
  }

  async add() {                                                     // Submit handler to add a new window
    if (this.form.invalid) { this.form.markAllAsTouched(); return; } // Validate form; show errors if invalid
    const w = this.form.value as any;                               // Extract form values

    try {
      await this.ui.withLoading(                                    // Show spinner while calling API
        () => this.proSvc.addMyDisponibilites([w]).toPromise(),     // POST new window(s) to backend
        'Ajout du créneau...'                                       // Loading message
      );
      this.form.reset();                                            // Clear the form after success
      this.reload();                                                // Refresh the list
      await this.ui.success('Créneau ajouté');                      // Success toast
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur');           // Error toast
    }
  }

  async remove(win: { _id: string }) {                              // Delete a specific window by id
    const ok = await this.ui.confirm('Supprimer ce créneau ?', '', 'Supprimer', 'Annuler'); // Confirm dialog
    if (!ok) return;                                                // Abort if user cancels

    try {
      await this.ui.withLoading(                                    // Show spinner while deleting
        () => this.proSvc.deleteMyDisponibilite(win._id).toPromise(), // DELETE call to backend
        'Suppression...'                                            // Loading message
      );
      this.reload();                                                // Refresh the list
      await this.ui.success('Créneau supprimé');                    // Success toast
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur');           // Error toast
    }
  }
}
