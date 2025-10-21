import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonSelect, IonSelectOption, IonNote, IonList
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { personAdd, person, mail, lockClosed, briefcase } from 'ionicons/icons';

import { AuthService } from '../../services/auth/auth';
import { UiService } from '../../services/ui/ui.service'; // <-- no ".ts" in import path!

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonInput, IonItem, IonLabel, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonNote, IonList
  ],
})
export class RegisterPage {
  showPwd = false;
  errorMsg = '';

  roleOptions: Array<'CLIENT' | 'PROFESSIONNEL' | 'ADMIN'> = ['CLIENT', 'PROFESSIONNEL', 'ADMIN'];

  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    pwd: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENT', [Validators.required]],
    specialite: [''],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private ui: UiService
  ) {
    addIcons({ personAdd, person, mail, lockClosed, briefcase });
  }

  get nom()        { return this.form.get('nom'); }
  get email()      { return this.form.get('email'); }
  get pwd()        { return this.form.get('pwd'); }
  get role()       { return this.form.get('role'); }
  get specialite() { return this.form.get('specialite'); }

  isPro(): boolean { return this.role?.value === 'PROFESSIONNEL'; }

  async submit() {
    this.errorMsg = '';

    // Require specialité for PRO
    if (this.isPro()) {
      this.specialite?.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      this.specialite?.clearValidators();
    }
    this.specialite?.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      await this.ui.warn('Veuillez corriger les erreurs.');
      return;
    }

    const dto = this.form.value as {
      nom: string; email: string; pwd: string; role: 'CLIENT'|'PROFESSIONNEL'|'ADMIN'; specialite?: string;
    };

    try {
      await this.ui.withLoading(() => this.auth.register(dto).toPromise(), 'Création du compte...');
      await this.ui.success('Inscription réussie');
      this.router.navigateByUrl('/login');
    } catch (err: any) {
      this.errorMsg = err?.error?.message || 'Inscription échouée';
      await this.ui.error(this.errorMsg);
    }
  }

  goLogin() { this.router.navigateByUrl('/login'); }
}
