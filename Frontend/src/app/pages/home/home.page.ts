import { Component } from '@angular/core';
import { IonContent, IonItem, IonLabel, IonList } from '@ionic/angular/standalone';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, IonItem, IonLabel, IonList, AsyncPipe, NgIf]
})
export class HomePage {
  constructor(public auth: AuthService) {}
}
