// src/app/pages/register/register.page.ts
import { Component } from '@angular/core';                         // Imports the Component decorator
import { Router } from '@angular/router';                          // Router for navigation
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'; // Reactive Forms APIs
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonSelect, IonSelectOption, IonNote, IonList
} from '@ionic/angular/standalone';                               // Standalone Ionic components
import { CommonModule } from '@angular/common';                    // Common Angular directives (ngIf, ngFor, etc.)
import { addIcons } from 'ionicons';                               // Helper to register Ionicons at runtime
import { personAdd, person, mail, lockClosed, briefcase } from 'ionicons/icons'; // Specific icon glyphs

import { AuthService } from '../../services/auth/auth';            // App auth service
import { UiService } from '../../services/ui/ui.service'; // <-- no ".ts" in import path!  // Toasts, alerts, loaders

@Component({
  selector: 'app-register',                                        // Component selector used in templates
  templateUrl: './register.page.html',                             // External HTML template
  styleUrls: ['./register.page.scss'],                             // External stylesheet(s)
  standalone: true,                                                // Standalone Angular component
  imports: [
    CommonModule, ReactiveFormsModule,                             // Modules made available to this component
    IonContent, IonHeader, IonToolbar, IonTitle,                   // Ionic UI elements used in the template
    IonInput, IonItem, IonLabel, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonNote, IonList
  ],
})
export class RegisterPage {
  showPwd = false;                                                 // Toggles password visibility
  errorMsg = '';                                                   // Holds backend/server error message

  roleOptions: Array<'CLIENT' | 'PROFESSIONNEL' | 'ADMIN'> = ['CLIENT', 'PROFESSIONNEL', 'ADMIN']; // Allowed roles

  form = this.fb.group({                                           // Reactive form definition
    nom: ['', [Validators.required, Validators.minLength(2)]],     // Required name, min length 2
    email: ['', [Validators.required, Validators.email]],          // Required valid email
    pwd: ['', [Validators.required, Validators.minLength(6)]],     // Required password, min length 6
    role: ['CLIENT', [Validators.required]],                       // Default role is CLIENT
    specialite: [''],                                              // Optional; required only if role === PROFESSIONNEL
  });

  constructor(
    private fb: FormBuilder,                                       // Injects FormBuilder to create the form
    private auth: AuthService,                                     // Injects AuthService to call API
    private router: Router,                                        // Injects Router for navigation
    private ui: UiService                                          // Injects UI helper (toasts, alerts, loading)
  ) {
    addIcons({ personAdd, person, mail, lockClosed, briefcase });  // Registers icons so they can render
  }

  get nom()        { return this.form.get('nom'); }                // Convenience accessor for template
  get email()      { return this.form.get('email'); }              // Convenience accessor for template
  get pwd()        { return this.form.get('pwd'); }                // Convenience accessor for template
  get role()       { return this.form.get('role'); }               // Convenience accessor for template
  get specialite() { return this.form.get('specialite'); }         // Convenience accessor for template

  isPro(): boolean { return this.role?.value === 'PROFESSIONNEL'; } // True if selected role is PROFESSIONNEL

  async submit() {                                                 // Submit handler for the registration form
    this.errorMsg = '';                                            // Clear previous error

    // Require specialité for PRO
    if (this.isPro()) {                                            // If the selected role is PROFESSIONNEL
      this.specialite?.addValidators([Validators.required, Validators.minLength(2)]); // Add validators dynamically
    } else {
      this.specialite?.clearValidators();                          // Clear validators when not PRO
    }
    this.specialite?.updateValueAndValidity();                     // Recompute validity after changing validators

    if (this.form.invalid) {                                       // If any control is invalid
      this.form.markAllAsTouched();                                // Mark controls so errors display
      await this.ui.warn('Veuillez corriger les erreurs.');        // Show a warning toast
      return;                                                      // Abort submission
    }

    const dto = this.form.value as {                               // Build DTO exactly as backend expects
      nom: string; email: string; pwd: string; role: 'CLIENT'|'PROFESSIONNEL'|'ADMIN'; specialite?: string;
    };

    try {
      await this.ui.withLoading(() => this.auth.register(dto).toPromise(), 'Création du compte...'); // Show loader while calling API
      await this.ui.success('Inscription réussie');                // Success toast
      this.router.navigateByUrl('/login');                         // Navigate to login page
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Inscription échouée';// Extract error message or fallback
      await this.ui.error(this.errorMsg);                          // Error toast
    }
  }

  goLogin() { this.router.navigateByUrl('/login'); }               // Navigate to login (secondary action)
}
