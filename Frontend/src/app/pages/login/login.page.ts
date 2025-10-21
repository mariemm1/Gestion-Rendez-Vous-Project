// src/app/pages/login/login.page.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonNote, IonList
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { logIn, eye, eyeOff, mail, lockClosed } from 'ionicons/icons';

import { AuthService } from '../../services/auth/auth';
import { UiService } from '../../services/ui/ui.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonInput, IonItem, IonLabel, IonButton, IonIcon, IonNote, IonList
  ],
})
export class LoginPage {
  showPwd = false;
  errorMsg = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private ui: UiService
  ) {
    addIcons({ logIn, eye, eyeOff, mail, lockClosed });
  }

  get email()    { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  async submit() {
    this.errorMsg = '';
    if (this.form.invalid) { this.form.markAllAsTouched(); await this.ui.warn('Champs invalides'); return; }

    const dto = this.form.value as { email: string; password: string };

    try {
      await this.ui.withLoading(() => this.auth.login(dto).toPromise(), 'Connexion...');
      await this.ui.success('Bienvenue !');
      const role = this.auth.role;
      if (role === 'ADMIN')               this.router.navigateByUrl('/admin/dashboard');
      else if (role === 'PROFESSIONNEL')  this.router.navigateByUrl('/pro/dashboard');
      else                                this.router.navigateByUrl('/client/dashboard');
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Échec de connexion';
      await this.ui.error(this.errorMsg);
    }
  }

  goRegister() { this.router.navigateByUrl('/register'); }
}
