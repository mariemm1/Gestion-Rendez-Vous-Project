// src/app/pages/login/login.page.ts
import { Component } from '@angular/core';                               // Angular decorator for components
import { Router } from '@angular/router';                                // Router service for navigation
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms'; // Reactive forms utilities & module
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonNote, IonList
} from '@ionic/angular/standalone';                                      // Standalone Ionic UI components
import { CommonModule } from '@angular/common';                          // Common Angular directives/pipes
import { addIcons } from 'ionicons';                                     // Utility to register Ionicons
import { logIn, eye, eyeOff, mail, lockClosed } from 'ionicons/icons';   // Specific icons used in this page

import { AuthService } from '../../services/auth/auth';                  // App auth service (login/me/etc.)
import { UiService } from '../../services/ui/ui.service';                // UI helpers (loading/toast/alerts)

@Component({
  standalone: true,                                                      // This component is standalone (no NgModule)
  selector: 'app-login',                                                 // Selector used in templates (if embedded)
  templateUrl: './login.page.html',                                      // External HTML template file
  styleUrls: ['./login.page.scss'],                                      // SCSS styles for this page
  imports: [                                                             // Modules/components made available to template
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonInput, IonItem, IonLabel, IonButton, IonIcon, IonNote, IonList
  ],
})
export class LoginPage {                                                 // Component class
  showPwd = false;                                                       // Toggles password visibility in the UI
  errorMsg = '';                                                         // Holds backend/validation error messages

  form = this.fb.group({                                                 // Reactive form definition
    email: ['', [Validators.required, Validators.email]],                // Email: required + must be a valid email
    password: ['', [Validators.required, Validators.minLength(6)]],      // Password: required + min length 6
  });

  constructor(
    private fb: FormBuilder,                                             // Injects FormBuilder to create the form
    private auth: AuthService,                                           // Injects AuthService to perform login
    private router: Router,                                              // Injects Router to navigate after login
    private ui: UiService                                                // Injects UiService for spinner/toasts
  ) {
    addIcons({ logIn, eye, eyeOff, mail, lockClosed });                  // Registers the icons used on this page
  }

  get email()    { return this.form.get('email'); }                      // Convenience getter for template
  get password() { return this.form.get('password'); }                   // Convenience getter for template

  async submit() {                                                       // Handles form submission
    this.errorMsg = '';                                                  // Reset any previous error
    if (this.form.invalid) {                                             // Client-side validation guard
      this.form.markAllAsTouched();                                      // Mark controls to show errors
      await this.ui.warn('Champs invalides');                            // Show a warning toast
      return;                                                            // Abort submit
    }

    const dto = this.form.value as { email: string; password: string };  // Extract typed credentials

    try {
      await this.ui.withLoading(                                         // Show spinner during async login
        () => this.auth.login(dto).toPromise(),                          // Convert Observable to Promise for await
        'Connexion...'                                                   // Spinner message
      );
      await this.ui.success('Bienvenue !');                              // Success toast
      const role = this.auth.role;                                       // Read role from decoded token
      if (role === 'ADMIN')               this.router.navigateByUrl('/admin/dashboard');     // Route by role
      else if (role === 'PROFESSIONNEL')  this.router.navigateByUrl('/pro/dashboard');       // Pro dashboard
      else                                this.router.navigateByUrl('/client/dashboard');    // Client dashboard
    } catch (err: any) {                                                 // On error (HTTP/auth failure)
      this.errorMsg = err?.error?.message || 'Échec de connexion';       // Store readable error
      await this.ui.error(this.errorMsg);                                // Show error toast
    }
  }

  goRegister() { this.router.navigateByUrl('/register'); }               // Navigate to the register page
}
