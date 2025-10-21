// src/app/services/pro/pro.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Professionnel } from '../../models/pro/pro';

export interface PublicDayDispoResponse {
  date: string; // YYYY-MM-DD
  windows: Array<{ _id: string; heure_debut: string; heure_fin: string }>;
  hoursTaken: string[]; // ["HH:mm", ...]
}

@Injectable({ providedIn: 'root' })
export class ProService {
  private base = `${environment.apiUrl}/prof`;

  constructor(private http: HttpClient) { }

  // ------------ ADMIN ------------
  create(data: { nom: string; email: string; pwd: string; specialite: string; disponibilites?: { date: string; heure_debut: string; heure_fin: string }[] }) {
    return this.http.post<{ message: string; professionnel: Professionnel }>(`${this.base}/create`, data);
  }
  getAll(): Observable<Professionnel[]> {
    return this.http.get<Professionnel[]>(`${this.base}/all`);
  }
  getByNom(nom: string): Observable<Professionnel> {
    return this.http.get<Professionnel>(`${this.base}/by-nom/${encodeURIComponent(nom)}`);
  }
  updateByEmail(email: string, data: { nom?: string; email?: string; pwd?: string }) {
    return this.http.put<{ message: string; professionnel: Professionnel }>(`${this.base}/by-email/${encodeURIComponent(email)}`, data);
  }
  deleteByUserId(userId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${encodeURIComponent(userId)}`);
  }

  // ------------ PUBLIC ------------
  getPublic(): Observable<Array<{ _id: string; userId: string; nom: string; email: string; specialite: string }>> {
    return this.http.get<Array<{ _id: string; userId: string; nom: string; email: string; specialite: string }>>(`${this.base}/public`);
  }

  /** ⬇️ RAW windows for a single day (public endpoint) */
  getPublicDayDisponibilites(userId: string, date: string) {
    // date is YYYY-MM-DD
    return this.http.get<PublicDayDispoResponse>(`${this.base}/public/${encodeURIComponent(userId)}/disponibilites`, {
      params: { date }
    });
  }

  // ------------ PRO (SELF windows) ------------
  addMyDisponibilites(windows: { date: string; heure_debut: string; heure_fin: string }[]) {
    return this.http.post(`${this.base}/me/disponibilites`, { windows });
  }
  getMyDisponibilites(): Observable<Array<{ _id: string; date: string; heure_debut: string; heure_fin: string }>> {
    return this.http.get<Array<{ _id: string; date: string; heure_debut: string; heure_fin: string }>>(`${this.base}/me/disponibilites`);
  }
  deleteMyDisponibilite(dispoId: string) {
    return this.http.delete(`${this.base}/me/disponibilites/${encodeURIComponent(dispoId)}`);
  }

  // (Keep these if used elsewhere)
  getDisponibilites(userId: string, params?: { from?: string; to?: string; step?: number }) {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.step) q.set('step', String(params.step));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.http.get<{ date: string; heure_debut: string; heure_fin: string; step: number; freeSlots: string[] }[]>(
      `${this.base}/${encodeURIComponent(userId)}/disponibilites${qs}`
    );
  }
  getComputedDisponibilites(userId: string, params?: { from?: string; to?: string; step?: number }) {
    return this.getDisponibilites(userId, params);
  }

  /** Public: raw availability windows (exactly what the pro registered) */
  getPublicWindows(userId: string, params?: { from?: string; to?: string }) {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.http.get<Array<{ date: string; heure_debut: string; heure_fin: string }>>(
      `${this.base}/public/${encodeURIComponent(userId)}/windows${qs}`
    );
  }

}
