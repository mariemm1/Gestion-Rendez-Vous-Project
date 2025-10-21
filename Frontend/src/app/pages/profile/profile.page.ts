// src/app/pages/profile/profile.page.ts
import { Component, OnDestroy, OnInit } from '@angular/core';                           // Import Angular core primitives for component lifecycle
import { CommonModule } from '@angular/common';                                         // Common Angular directives/pipes (*ngIf, *ngFor, etc.)
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonAvatar,          // Ionic UI components (standalone)
  IonButton, IonIcon, IonInput, IonList, IonNote
} from '@ionic/angular/standalone';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';         // Reactive forms API
import { Subscription } from 'rxjs';                                                   // RxJS subscription for cleanup
import { addIcons } from 'ionicons';                                                   // Utility to register Ionicons at runtime
import { camera, save, person, mail, lockClosed } from 'ionicons/icons';               // Specific Ionicons used in the UI

import { AuthService } from '../../services/auth/auth';                                // App auth service (current user, /auth/me, etc.)
import { MediaService } from '../../services/media/media';                             // Service to take/pick photo & upload avatar
import { UiService } from '../../services/ui/ui.service';                              // Toasts / alerts / loading helpers
import { User } from '../../models/user/user';                                         // Strongly-typed User model for the UI
import { environment } from '../../../environments/environment';                       // Environment (contains apiUrl for absolute avatar URL)

@Component({
  standalone: true,                                                                    // This component is standalone (no NgModule)
  selector: 'app-profile',                                                             // Selector tag name (not used directly since routed)
  templateUrl: './profile.page.html',                                                  // External HTML template
  styleUrls: ['./profile.page.scss'],                                                  // Component styles
  imports: [                                                                           // Modules/components available in the template
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonLabel, IonAvatar, IonButton, IonIcon,
    IonInput, IonList, IonNote
  ],
})
export class ProfilePage implements OnInit, OnDestroy {
  /** Current user snapshot for the header card */
  user?: User;                                                                          // Holds current user data to render header card

  /** Subscriptions cleanup */
  private sub = new Subscription();                                                     // Collect subscriptions to unsubscribe on destroy

  /** Used to force-refresh the <img> after an upload (cache buster) */
  private bust = 0;                                                                      // Changes query string to bypass browser cache

  /** Reactive form (role is display only) */
  form = this.fb.group({                                                                 // Build reactive form
    nom: ['', [Validators.required, Validators.minLength(2)]],                           // Name: required, min length 2
    email: ['', [Validators.required, Validators.email]],                                // Email: required, valid format
    password: [''],                                                                      // Optional new password (validated on save)
    role: [{ value: '', disabled: true }]                                                // Role: read-only (disabled in the form)
  });

  constructor(
    private fb: FormBuilder,                                                             // Inject FormBuilder
    private auth: AuthService,                                                           // Inject AuthService (user/me/update)
    private media: MediaService,                                                         // Inject MediaService (camera/gallery/upload)
    private ui: UiService                                                                 // Inject UiService (loading/toasts/alerts)
  ) {
    addIcons({ camera, save, person, mail, lockClosed });                                 // Register the used Ionicons
  }

  ngOnInit() {                                                                            // Lifecycle: component initialization
    // Populate the form whenever the user stream emits
    this.sub.add(                                                                          // Track subscription for cleanup
      this.auth.user$.subscribe(u => {                                                     // Subscribe to user BehaviorSubject
        if (!u) return;                                                                    // Ignore null/undefined emissions
        this.user = u;                                                                     // Keep a snapshot for header card
        this.form.patchValue(                                                              // Populate form controls without triggering valueChanges
          { nom: u.nom, email: u.email, role: u.role },
          { emitEvent: false }
        );
      })
    );

    // If we refreshed and the stream is empty, fetch /auth/me once
    if (!this.auth.userId && this.auth.isLoggedIn()) {                                     // If token exists but user$ not populated yet
      this.sub.add(this.auth.me().subscribe());                                            // Call /auth/me and track subscription
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }                                               // Lifecycle: clean subscriptions to avoid leaks

  /** Build an absolute img src (prefix API base) + cache busting */
  avatarSrc(u?: User): string {                                                            // Helper to compute avatar URL used by <img>
    const placeholder = 'assets/avatar-placeholder.png';                                   // Local placeholder if no avatar set
    if (!u?.avatarUrl) return placeholder;                                                 // Return placeholder when absent

    // If backend already returns an absolute URL, use it as-is
    const isAbs = /^https?:\/\//i.test(u.avatarUrl);                                       // Detect absolute URLs (http/https)
    const base = isAbs ? '' : environment.apiUrl;                                          // If relative, prefix with apiUrl
    const buster = this.bust ? `?v=${this.bust}` : '';                                      // Optional query param to bypass cache
    return `${base}${u.avatarUrl}${buster}`;                                               // Compose final URL
  }

  // -----------------------------
  // Avatar (camera or gallery)
  // -----------------------------
  async changePhoto() {                                                                     // Entry point when clicking “Changer la photo”
    // Tiny confirm = choose camera vs gallery
    const useCamera = await this.ui.confirm(                                                // Use UiService.confirm to choose source
      'Photo de profil',
      'Choisir la source de la photo',
      'Caméra',
      'Galerie'
    );

    try {
      const blob = useCamera ? await this.media.takePhoto() : await this.media.pickPhoto(); // Capture or pick photo → Blob

      await this.ui.withLoading(                                                             // Show loading while uploading
        () => this.media.uploadAvatar(blob).toPromise(),
        'Téléversement...'
      );

      await this.ui.success('Photo mise à jour');                                            // Success toast after upload

      // Update local user stream so header card changes immediately
      // (you can either reload from /auth/me or trust the upload response;
      // here we reload to stay consistent)
      this.auth.me().subscribe(() => {                                                       // Reload /auth/me to refresh user$ (avatarUrl)
        // force <img> refresh (avoid browser cache)
        this.bust = Date.now();                                                              // Update cache-buster to refresh <img> binding
      });
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Échec du téléversement');                    // Error toast on failure
    }
  }

  // -----------------------------
  // Save profile info
  // -----------------------------
  async save() {                                                                            // Called by “Enregistrer” button
    if (this.form.invalid) {                                                                // Guard: invalid form
      this.form.markAllAsTouched();                                                         // Show validation errors
      return;                                                                               // Abort save
    }

    const { nom, email, password } = this.form.value;                                       // Extract form values
    const payload: any = { nom, email };                                                    // Base payload for update

    if ((password || '').length) {                                                          // If password field not empty
      if ((password as string).length < 6) {                                                // Validate min length 6
        await this.ui.warn('Mot de passe trop court (minimum 6 caractères).');              // Warn and abort
        return;
      }
      payload.password = password;                                                          // Include password in payload
    }

    try {
      await this.ui.withLoading(                                                             // Show loading during /auth/me update
        () => this.auth.updateMe(payload).toPromise(),
        'Mise à jour du profil...'
      );
      await this.ui.success('Profil mis à jour');                                           // Success toast
      // Clear only the password box
      this.form.get('password')?.reset();                                                   // Reset password field after success
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Mise à jour impossible');                   // Error toast on failure
    }
  }
}
