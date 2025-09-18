import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CompanyAdminService {
  private apiUrl = 'https://punchinsystemapi.azurewebsites.net/api/Admin';

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    console.log('JWT Token from localStorage:', token);
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

  addAdmin(admin: any): Observable<any> {
    console.log('Sending admin data to API:', admin);
    console.log('Auth headers:', this.getAuthHeaders());
    return this.http.post(this.apiUrl, admin, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError((error) => {
        console.error('Error adding admin:', error);
        // Handle non-JSON error responses
        if (error.error && typeof error.error === 'string') {
          const customError = new Error(error.error);
          customError.name = 'HttpErrorResponse';
          return throwError(() => customError);
        }
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
