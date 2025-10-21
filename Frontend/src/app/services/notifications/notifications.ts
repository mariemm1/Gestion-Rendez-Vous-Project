// Frontend/src/app/services/notification/notifications.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../../models/notification/notification';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private base = `${environment.apiUrl}/notification`;

  private _unread$ = new BehaviorSubject<number>(0);
  /** Shared unread badge count observable */
  unread$ = this._unread$.asObservable();

  constructor(private http: HttpClient) {}

  /** List all notifications for a user (client or pro). */
  listForUser(userId: string) {
    return this.http.get<Notification[]>(`${this.base}/${userId}`);
  }

  /** Recompute and push unread count (safe on null/undefined). */
  refreshUnread(userId?: string | null) {
    if (!userId) return;
    this.listForUser(userId)
      .pipe(map(list => (list || []).filter(n => !n.lue).length))
      .subscribe(count => this._unread$.next(count));
  }

  /** Mark one notification read, then refresh unread. */
  markRead(notificationId: string, userIdToRefresh?: string | null) {
    return this.http.put<{ message: string }>(`${this.base}/lire/${notificationId}`, {})
      .pipe(tap(() => this.refreshUnread(userIdToRefresh)));
  }

  /** Delete a notification, then refresh unread. */
  delete(notificationId: string, userIdToRefresh?: string | null) {
    return this.http.delete<{ message: string }>(`${this.base}/${notificationId}`)
      .pipe(tap(() => this.refreshUnread(userIdToRefresh)));
  }
}
