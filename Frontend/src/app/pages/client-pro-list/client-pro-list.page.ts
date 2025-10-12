import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonSearchbar
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { ProService } from '../../services/pro/pro';

@Component({
  selector: 'app-client-pro-list',
  templateUrl: './client-pro-list.page.html',
  styleUrls: ['./client-pro-list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonSearchbar
  ],
})
export class ClientProListPage {
  all: Array<{ userId: string; nom: string; email: string; specialite: string }> = [];
  q = '';

  constructor(private proSvc: ProService, private router: Router) {
    this.proSvc.getPublic().subscribe(list => this.all = list as any);
  }

  filtered() {
    const s = (this.q || '').toLowerCase();
    return this.all.filter(p =>
      (p.nom || '').toLowerCase().includes(s) || (p.specialite || '').toLowerCase().includes(s)
    );
  }

  open(p: { userId: string }) {
    this.router.navigate(['/client/book', p.userId]); // pro's userId
  }
}