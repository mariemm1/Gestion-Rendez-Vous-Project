import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    pwd: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastController
  ) {}

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.auth.login(this.form.value as any).subscribe({
      next: async () => {
        this.loading = false;
        await (await this.toast.create({ message: 'Welcome!', duration: 1200 })).present();
        this.router.navigateByUrl('/tabs/home');
      },
      error: async (e) => {
        this.loading = false;
        await (await this.toast.create({ message: e?.error?.message || 'Login failed', color: 'danger', duration: 1800 })).present();
      }
    });
  }
}
