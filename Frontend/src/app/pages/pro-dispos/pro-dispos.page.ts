import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonItem, IonLabel, IonInput,
  IonButton, IonList, IonNote
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProService } from '../../services/pro/pro';
import { UiService } from '../../services/ui/ui.service';

@Component({
  selector: 'app-pro-dispos',
  templateUrl: './pro-dispos.page.html',
  styleUrls: ['./pro-dispos.page.scss'],
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonItem, IonLabel, IonInput, IonButton, IonList, IonNote
  ],
})
export class ProDisposPage {
  msg = '';
  list: { _id: string; date: string; heure_debut: string; heure_fin: string }[] = [];

  form = this.fb.group({
    date: ['', Validators.required],        // YYYY-MM-DD
    heure_debut: ['', Validators.required], // HH:mm
    heure_fin: ['', Validators.required],   // HH:mm
  });

  constructor(
    private fb: FormBuilder,
    private proSvc: ProService,
    private ui: UiService
  ) { this.reload(); }

  reload() {
    this.proSvc.getMyDisponibilites().subscribe(wins => {
      this.list = (wins || []).map(w => ({
        _id: w._id,
        date: new Date(w.date).toISOString().substring(0, 10),
        heure_debut: w.heure_debut,
        heure_fin: w.heure_fin,
      }));
    });
  }

  async add() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const w = this.form.value as any;

    try {
      await this.ui.withLoading(
        () => this.proSvc.addMyDisponibilites([w]).toPromise(),
        'Ajout du créneau...'
      );
      this.form.reset();
      this.reload();
      await this.ui.success('Créneau ajouté');
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur');
    }
  }

  async remove(win: { _id: string }) {
    const ok = await this.ui.confirm('Supprimer ce créneau ?', '', 'Supprimer', 'Annuler');
    if (!ok) return;

    try {
      await this.ui.withLoading(
        () => this.proSvc.deleteMyDisponibilite(win._id).toPromise(),
        'Suppression...'
      );
      this.reload();
      await this.ui.success('Créneau supprimé');
    } catch (e: any) {
      await this.ui.error(e?.error?.message || 'Erreur');
    }
  }
}
