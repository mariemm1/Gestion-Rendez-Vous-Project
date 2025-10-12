// src/app/services/rdv/rdv.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { RendezVous } from '../../models/rendezvous/rendezvous';


@Injectable({ providedIn: 'root' })
export class RdvService {
  private base = `${environment.apiUrl}/rendezVous`; // capital V

  constructor(private http: HttpClient) { }

  // Client
  getClientRdvs(clientUserId: string): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.base}/client/${clientUserId}`);
  }
  take(clientId: string, data: { date: string; heure: string; professionnel_id: string }) {
    return this.http.post(`${this.base}/prendre/${clientId}`, data);
  }
  cancel(clientUserId: string, rendezvousId: string) {
    return this.http.put(`${this.base}/annuler/${clientUserId}/${rendezvousId}`, {});
  }
  deleteCancelled(clientUserId: string, rendezvousId: string) {
    return this.http.delete(`${this.base}/annuler/${clientUserId}/${rendezvousId}`);
  }

  // Professional
  getProRdvs(userId: string) {
    return this.http.get<RendezVous[]>(`${this.base}/professionnel/${userId}`);
  }
  getProPending(userId: string) {
    return this.http.get<RendezVous[]>(`${this.base}/professionnel/${userId}/en-attente`);
  }
  getProConfirmed(userId: string) {
    return this.http.get<RendezVous[]>(`${this.base}/professionnel/${userId}/confirme`);
  }
  confirmByPro(userId: string, rendezvousId: string) {
    return this.http.put(`${this.base}/confirmer/${userId}/${rendezvousId}`, {});
  }
  // Book using pro's userId + selected date/hour
  book(clientId: string, proUserId: string, payload: { date: string; heure: string }) {
    return this.http.post(`${this.base}/prendre/${clientId}`, { ...payload, professionnel_id: proUserId });
  }

}
