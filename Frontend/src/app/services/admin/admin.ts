import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Admin } from '../../models/admin/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiUrl}/admin`;
  constructor(private http: HttpClient) {}

  create(data: { nom: string; email: string; pwd: string }) {             // ADMIN
    return this.http.post<{ message: string; admin: Admin }>(`${this.base}/create`, data);
  }

  getAll(): Observable<Admin[]> {                                          // ADMIN
    return this.http.get<Admin[]>(`${this.base}/all`);
  }

  getByNom(nom: string): Observable<Admin> {                               // ADMIN
    return this.http.get<Admin>(`${this.base}/${encodeURIComponent(nom)}`);
  }

  updateByEmail(email: string, data: { nom?: string; email?: string; pwd?: string }) { // ADMIN
    return this.http.put<{ message: string; admin: Admin }>(`${this.base}/${encodeURIComponent(email)}`, data);
  }

  deleteByUserId(userId: string) {                                         // ADMIN
    return this.http.delete<{ message: string }>(`${this.base}/${encodeURIComponent(userId)}`);
  }
}
