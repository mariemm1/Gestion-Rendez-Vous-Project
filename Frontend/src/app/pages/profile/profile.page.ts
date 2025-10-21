import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonAvatar,
  IonButton, IonIcon, IonInput, IonList, IonNote
} from '@ionic/angular/standalone';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { camera, save, person, mail, lockClosed } from 'ionicons/icons';

import { AuthService } from '../../services/auth/auth';
import { MediaService } from '../../services/media/media';
import { UiService } from '../../services/ui/ui.service';
import { User } from '../../models/user/user';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonLabel, IonAvatar, IonButton, IonIcon,
    IonInput, IonList, IonNote
  ],
})
export class ProfilePage implements OnInit, OnDestroy {
  /** Current user snapshot for the header card */
  user?: User;

  /** Subscriptions cleanup */
  private sub = new Subscription();

  /** Used to force-refresh the <img> after an upload (cache buster) */
  private bust = 0;

  /** Reactive form (role is display only) */
  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],                     // optional; if set, must be >= 6
    role: [{ value: '', disabled: true }]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private media: MediaService,
    private ui: UiService
  ) {
    addIcons({ camera, save, person, mail, lockClosed });
  }

  ngOnInit() {
    // Populate the form whenever the user stream emits
    this.sub.add(
      this.auth.user$.subscribe(u => {
        if (!u) return;
        this.user = u;
        this.form.patchValue(
          { nom: u.nom, email: u.email, role: u.role },
          { emitEvent: false }
        );
      })
    );

    // If we refreshed and the stream is empty, fetch /auth/me once
    if (!this.auth.userId && this.auth.isLoggedIn()) {
      this.sub.add(this.auth.me().subscribe());
    }
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  /** Build an absolute img src (prefix API base) + cache busting */
  avatarSrc(u?: User): string {
    const placeholder = 'assets/avatar-placeholder.png';
    if (!u?.avatarUrl) return placeholder;

    // If backend already returns an absolute URL, use it as-is
    const isAbs = /^https?:\/\//i.test(u.avatarUrl);
    const base = isAbs ? '' : environment.apiUrl; // e.g. http://localhost:3000
    const buster = this.bust ? `?v=${this.bust}` : '';
    return `${base}${u.avatarUrl}${buster}`;
  }

  // -----------------------------
  // Avatar (camera or gallery)
  // -----------------------------
  async changePhoto() {
    // Tiny confirm = choose camera vs gallery
    const useCamera = await this.ui.confirm(
      'Photo de profil',
      'Choisir la source de la photo',
      'Caméra',
      'Galerie'
    );

    try {
      const blob = useCamera ? await this.media.takePhoto() : await this.media.pickPhoto();

      await this.ui.withLoading(
        () => this.media.uploadAvatar(blob).toPromise(),
        'Téléversement...'
      );

      await this.ui.success('Photo mise à jour');

      // Update local user stream so header card changes immediately
      // (you can either reload from /auth/me or trust the upload response;
      // here we reload to stay consistent)
      this.auth.me().subscribe(() => {
        // force <img> refresh (avoid browser cache)
        this.bust = Date.now();
      });
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Échec du téléversement');
    }
  }

  // -----------------------------
  // Save profile info
  // -----------------------------
  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nom, email, password } = this.form.value;
    const payload: any = { nom, email };

    if ((password || '').length) {
      if ((password as string).length < 6) {
        await this.ui.warn('Mot de passe trop court (minimum 6 caractères).');
        return;
      }
      payload.password = password;
    }

    try {
      await this.ui.withLoading(
        () => this.auth.updateMe(payload).toPromise(),
        'Mise à jour du profil...'
      );
      await this.ui.success('Profil mis à jour');
      // Clear only the password box
      this.form.get('password')?.reset();
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Mise à jour impossible');
    }
  }
}
