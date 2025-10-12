import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Professionnel } from '../../models/pro/pro';

// Backend /prof routes used here:
// POST   /prof/create                  (ADMIN only)
// GET    /prof/all                     (ADMIN only)
// GET    /prof/:nom                    (ADMIN or that professionnel)
// PUT    /prof/:email                  (ADMIN or that professionnel)
// DELETE /prof/:id                     (ADMIN only)



@Injectable({ providedIn: 'root' })
export class ProService {
  private base = `${environment.apiUrl}/prof`;

  constructor(private http: HttpClient) { }

  // ADMIN: create professionnel (also creates a Utilisateur with role PROFESSIONNEL)
  create(data: { nom: string; email: string; pwd: string; specialite: string; disponibilites?: { date: string; heure_debut: string; heure_fin: string }[] }) {
    return this.http.post<{ message: string; professionnel: Professionnel }>(`${this.base}/create`, data);
  }

  // ADMIN: list all
  getAll(): Observable<Professionnel[]> {
    return this.http.get<Professionnel[]>(`${this.base}/all`);
  }

  // ADMIN or owner: get by professional's display name (nom on user)
  getByNom(nom: string): Observable<Professionnel> {
    return this.http.get<Professionnel>(`${this.base}/${encodeURIComponent(nom)}`);
  }

  // ADMIN or owner: update by user's email
  updateByEmail(email: string, data: { nom?: string; email?: string; pwd?: string }) {
    return this.http.put<{ message: string; professionnel: Professionnel }>(`${this.base}/${encodeURIComponent(email)}`, data);
  }

  // ADMIN: delete by user's id (removes Professionnel + associated Utilisateur)
  deleteByUserId(userId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${encodeURIComponent(userId)}`);
  }

  // PUBLIC: list of pros for clients to browse (name + specialty)
  getPublic(): Observable<Array<{ _id: string; userId: string; nom: string; email: string; specialite: string }>> {
    return this.http.get<Array<{ _id: string; userId: string; nom: string; email: string; specialite: string }>>(
      `${this.base}/public`
    );
  }

  // PRO: add a day window
  addDisponibilite(userId: string, dto: { date: string; heure_debut: string; heure_fin: string }) {
    return this.http.post(`${this.base}/${encodeURIComponent(userId)}/disponibilites`, dto);
  }

  // PRO: delete a day window
  deleteDisponibilite(userId: string, dto: { date: string; heure_debut: string; heure_fin: string }) {
    return this.http.delete(`${this.base}/${encodeURIComponent(userId)}/disponibilites`, { body: dto });
  }

  // ANY: get available slots (computed) for a pro
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


}
