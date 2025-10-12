import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonSelect, IonSelectOption, IonNote, IonList
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
import { addIcons } from 'ionicons';
import { personAdd, person, mail, lockClosed, briefcase } from 'ionicons/icons';

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
  // Toggle password visibility (button uses text instead of icon here)
  showPwd = false;
  // API error holder
  errorMsg = '';

  // Allowed roles (must match backend)
  roleOptions: Array<'CLIENT' | 'PROFESSIONNEL' | 'ADMIN'> = ['CLIENT', 'PROFESSIONNEL', 'ADMIN'];

  // Reactive form; note pwd (not password) to match backend register DTO
  form = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    pwd: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENT', [Validators.required]],
    specialite: [''], // only required for PROFESSIONNEL
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    addIcons({ personAdd, person, mail, lockClosed, briefcase });
  }

  get nom()        { return this.form.get('nom'); }
  get email()      { return this.form.get('email'); }
  get pwd()        { return this.form.get('pwd'); }
  get role()       { return this.form.get('role'); }
  get specialite() { return this.form.get('specialite'); }

  // Helper: are we creating a professional?
  isPro(): boolean {
    return this.role?.value === 'PROFESSIONNEL';
  }

  // Submit registration; then redirect to login
  submit() {
    this.errorMsg = '';

    // Enforce 'specialite' only when PRO
    if (this.isPro()) {
      this.specialite?.addValidators([Validators.required, Validators.minLength(2)]);
      this.specialite?.updateValueAndValidity();
    } else {
      this.specialite?.clearValidators();
      this.specialite?.updateValueAndValidity();
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.form.value as {
      nom: string; email: string; pwd: string; role: 'CLIENT'|'PROFESSIONNEL'|'ADMIN'; specialite?: string;
    };

    this.auth.register(dto).subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: (err) => this.errorMsg = err?.error?.message || 'Inscription échouée'
    });
  }

  // Safe navigation back to login (prevents form submit)
  goLogin() { this.router.navigateByUrl('/login'); }
}
