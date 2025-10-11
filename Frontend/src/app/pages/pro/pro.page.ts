import { Component } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-pro',
  templateUrl: './pro.page.html',
  styleUrls: ['./pro.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, IonTitle],
})
export class ProPage {}
