import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonFooter } from '@ionic/angular/standalone';
import { RouterLink, RouterOutlet } from '@angular/router';
import { addIcons } from 'ionicons';
import { home, calendar, notifications, personCircle } from 'ionicons/icons';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonFooter,
    RouterLink, RouterOutlet]
})
export class TabsPage {
  constructor(private auth: AuthService) {
    // load the icons for usage
    addIcons({ home, calendar, notifications, personCircle });
  }
  logout() { this.auth.logout(); }
}
