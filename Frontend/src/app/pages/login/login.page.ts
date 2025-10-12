import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonInput, IonItem, IonLabel,
  IonButton, IonIcon, IonNote, IonList
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';
import { addIcons } from 'ionicons';
import { logIn, eye, eyeOff, mail, lockClosed } from 'ionicons/icons';

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
  // Toggle password visibility
  showPwd = false;
  // Server/API error message holder
  errorMsg = '';

  // Reactive form: backend needs email + password
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    addIcons({ logIn, eye, eyeOff, mail, lockClosed });
  }

  get email()    { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  // Submit login; route by role after token is saved
  submit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.form.value as { email: string; password: string };

    this.auth.login(dto).subscribe({
      next: () => {
        const role = this.auth.role;
        if (role === 'ADMIN')               this.router.navigateByUrl('/admin/dashboard');
        else if (role === 'PROFESSIONNEL')  this.router.navigateByUrl('/pro/dashboard');
        else                                this.router.navigateByUrl('/client/dashboard');
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Échec de connexion';
      },
    });
  }

  // Safe navigation from inside the form (prevents form submit)
  goRegister() { this.router.navigateByUrl('/register'); }
}
