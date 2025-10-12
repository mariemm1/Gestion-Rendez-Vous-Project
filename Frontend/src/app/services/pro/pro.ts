// src/app/services/pro/pro.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Professionnel } from '../../models/pro/pro';

@Injectable({ providedIn: 'root' })
export class ProService {
  private base = `${environment.apiUrl}/prof`;

  constructor(private http: HttpClient) {}

  // ------------ ADMIN ------------
  create(data: { nom: string; email: string; pwd: string; specialite: string; disponibilites?: { date: string; heure_debut: string; heure_fin: string }[] }) {
    return this.http.post<{ message: string; professionnel: Professionnel }>(`${this.base}/create`, data);
  }
  getAll(): Observable<Professionnel[]> {
    return this.http.get<Professionnel[]>(`${this.base}/all`);
  }
  // backend now uses non-ambiguous paths
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

  // ------------ PRO (SELF windows) ------------
  /** Add one or many windows for the connected professional */
  addMyDisponibilites(windows: { date: string; heure_debut: string; heure_fin: string }[]) {
    return this.http.post(`${this.base}/me/disponibilites`, { windows });
  }
  /** List raw windows for the connected professional */
  getMyDisponibilites(): Observable<Array<{ _id: string; date: string; heure_debut: string; heure_fin: string }>> {
    return this.http.get<Array<{ _id: string; date: string; heure_debut: string; heure_fin: string }>>(`${this.base}/me/disponibilites`);
  }
  /** Delete one window by its id */
  deleteMyDisponibilite(dispoId: string) {
    return this.http.delete(`${this.base}/me/disponibilites/${encodeURIComponent(dispoId)}`);
  }

  // computed free slots (windows minus RDVs)
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

  // alias so components can call either name
  // ------------ ANY (computed free slots for a pro) ------------
  getComputedDisponibilites(userId: string, params?: { from?: string; to?: string; step?: number }) {
    return this.getDisponibilites(userId, params);
  }
}
