import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface Designation {
  id: number;
  name: string;
  description: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedById?: number;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DesignationService {
  private apiUrl = 'https://localhost:7127/api/Designation';

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all designations
  getDesignations(): Observable<any> {
    return this.http.get<any>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in getDesignations:', error);
        return throwError(() => error);
      })
    );
  }

  // Get designation by ID
  getDesignationById(id: number): Observable<Designation> {
    return this.http.get<Designation>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in getDesignationById:', error);
        return throwError(() => error);
      })
    );
  }

  // Create new designation
  createDesignation(designation: Omit<Designation, 'id' | 'createdAt'>): Observable<Designation> {
    return this.http.post<Designation>(this.apiUrl, designation, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in createDesignation:', error);
        return throwError(() => error);
      })
    );
  }

  // Update existing designation
  updateDesignation(id: number, designation: Partial<Designation>): Observable<Designation> {
    return this.http.put<Designation>(`${this.apiUrl}/${id}`, designation, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in updateDesignation:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete designation (soft delete)
  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      catchError((error) => {
        console.error('Error in deleteDesignation:', error);
        return throwError(() => error);
      })
    );
  }
}