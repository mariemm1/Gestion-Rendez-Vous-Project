// src/app/pages/pro-dispos/pro-dispos.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput,
  IonButton, IonList, IonNote
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProService } from '../../services/pro/pro';

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
  list: { _id: string; date: string; heure_debut: string; heure_fin: string }[] = [];

  form = this.fb.group({
    date: ['', Validators.required],           // YYYY-MM-DD
    heure_debut: ['', Validators.required],    // HH:mm
    heure_fin: ['', Validators.required],      // HH:mm
  });

  constructor(private fb: FormBuilder, private proSvc: ProService) {
    this.reload();
  }

  reload() {
    this.proSvc.getMyDisponibilites().subscribe(wins => {
      // normalize date to YYYY-MM-DD for display
      this.list = (wins || []).map(w => ({
        _id: w._id,
        date: new Date(w.date).toISOString().substring(0,10),
        heure_debut: w.heure_debut,
        heure_fin: w.heure_fin
      }));
    });
  }

  add() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const w = this.form.value as any; // {date, heure_debut, heure_fin}
    this.proSvc.addMyDisponibilites([w]).subscribe({
      next: () => { this.msg = 'Créneau ajouté'; this.form.reset(); this.reload(); },
      error: e => { this.msg = e?.error?.message || 'Erreur'; }
    });
  }

  remove(win: { _id: string }) {
    this.proSvc.deleteMyDisponibilite(win._id).subscribe({
      next: () => { this.msg = 'Créneau supprimé'; this.reload(); },
      error: e => { this.msg = e?.error?.message || 'Erreur'; }
    });
  }
}
