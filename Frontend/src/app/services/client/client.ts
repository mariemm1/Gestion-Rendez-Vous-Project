import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Client } from '../../models/client/client';

// Backend /client routes used here:
// POST /client/create
// GET  /client/all               (ADMIN only)
// GET  /client/allH              (ADMIN only; with history)
// GET  /client/:nom              (ADMIN or self)
// PUT  /client/:email            (ADMIN or self)
// DELETE /client/:id             (ADMIN or self)



@Injectable({ providedIn: 'root' })
export class ClientService {
  private base = `${environment.apiUrl}/client`;

  constructor(private http: HttpClient) {}

  // used to retrieve the Client._id of the logged-in user
  me() {
    return this.http.get<{ _id: string }>(`${this.base}/me`);
  }

  // Public create (creates a Utilisateur with role CLIENT + Client doc)
  create(data: { nom: string; email: string; pwd: string; historiqueRendezVous?: string[] }) {
    return this.http.post<{ message: string; client: Client }>(`${this.base}/create`, data);
  }

  // ADMIN only
  getAll(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.base}/all`);
  }

  // ADMIN only — with populated history
  getAllWithHistory(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.base}/allH`);
  }

  // ADMIN or the client themselves
  getByNom(nom: string): Observable<Client> {
    return this.http.get<Client>(`${this.base}/${encodeURIComponent(nom)}`);
  }

  // ADMIN or the client themselves — update by the user's email
  updateByEmail(email: string, data: { nom?: string; email?: string; pwd?: string }) {
    return this.http.put<{ message: string; user: any }>(`${this.base}/${encodeURIComponent(email)}`, data);
  }

  // ADMIN or the client themselves — delete by the user's id
  deleteByUserId(userId: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${encodeURIComponent(userId)}`);
  }
}
