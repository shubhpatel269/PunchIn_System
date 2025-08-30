import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CompanyAdminService {
  private apiUrl = 'https://localhost:7127/api/Admin';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAdmins(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in getAdmins:', error);
        return throwError(() => error);
      })
    );
  }

  updateAdmin(admin: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${admin.adminId}`, admin, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error updating admin:', error);
        return throwError(() => error);
      })
    );
  }

  deleteAdmin(adminId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${adminId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error deleting admin:', error);
        return throwError(() => error);
      })
    );
  }
}
