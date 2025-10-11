// src/app/services/notification/notifications.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Notification } from '../../models/notification/notification';



@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private base = `${environment.apiUrl}/notification`;

  constructor(private http: HttpClient) {}

  // list current user's notifications
  listForUser(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/${userId}`);
  }

  // add a notification (usually server-driven, but exposed here if you need it)
  add(n: { utilisateur_id: string; role: 'CLIENT' | 'PROFESSIONNEL'; type: string; message: string }) {
    return this.http.post(`${this.base}/add`, n);
  }

  markRead(notificationId: string) {
    return this.http.put(`${this.base}/lire/${notificationId}`, {});
  }

  delete(notificationId: string) {
    return this.http.delete(`${this.base}/${notificationId}`);
  }
}
