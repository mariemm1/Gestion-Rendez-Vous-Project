import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput,
  IonButton, IonList, IonNote
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProService } from '../../services/pro/pro';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-pro-dispos',
  templateUrl: './pro-dispos.page.html',
  styleUrls: ['./pro-dispos.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput, IonButton, IonList, IonNote
  ],
})
export class ProDisposPage {
  msg = '';
  // We’ll display unique windows as returned by computed endpoint.
  list: { date: string; heure_debut: string; heure_fin: string }[] = [];

  form = this.fb.group({
    date: ['', Validators.required],           // YYYY-MM-DD
    heure_debut: ['', Validators.required],    // HH:mm
    heure_fin: ['', Validators.required],      // HH:mm
  });

  constructor(private fb: FormBuilder, private proSvc: ProService, private auth: AuthService) {
    this.reload();
  }

  reload() {
    const uid = this.auth.userId!;
    this.proSvc.getDisponibilites(uid).subscribe(wins => {
      this.list = wins.map(w => ({ date: w.date, heure_debut: w.heure_debut, heure_fin: w.heure_fin }));
    });
  }

  add() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const uid = this.auth.userId!;
    this.proSvc.addDisponibilite(uid, this.form.value as any).subscribe({
      next: () => { this.msg = 'Créneau ajouté'; this.form.reset(); this.reload(); },
      error: e => { this.msg = e?.error?.message || 'Erreur'; }
    });
  }

  remove(win: { date: string; heure_debut: string; heure_fin: string }) {
    const uid = this.auth.userId!;
    this.proSvc.deleteDisponibilite(uid, win).subscribe({
      next: () => { this.msg = 'Créneau supprimé'; this.reload(); },
      error: e => { this.msg = e?.error?.message || 'Erreur'; }
    });
  }
}
