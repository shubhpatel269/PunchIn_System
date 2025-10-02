import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, of, tap } from 'rxjs';

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
  private designationsCache: any | null = null;
  private cacheTimestamp: number = 0;
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes cache for designations (they change less frequently)

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all designations with caching
  getDesignations(forceRefresh: boolean = false): Observable<any> {
    // Check if we have valid cached data
    if (!forceRefresh && this.designationsCache && this.isCacheValid()) {
      return of(this.designationsCache);
    }

    return this.http.get<any>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      tap((designations) => {
        // Cache the designations data
        this.designationsCache = designations;
        this.cacheTimestamp = Date.now();
      }),
      catchError((error) => {
        console.error('Error in getDesignations:', error);
        return throwError(() => error);
      })
    );
  }

  clearDesignationsCache(): void {
    this.designationsCache = null;
    this.cacheTimestamp = 0;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.cacheExpiry;
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
      tap(() => this.clearDesignationsCache()), // Clear cache when data changes
      catchError((error) => {
        console.error('Error in createDesignation:', error);
        return throwError(() => error);
      })
    );
  }

  // Update existing designation
  updateDesignation(id: number, designation: Partial<Designation>): Observable<Designation> {
    return this.http.put<Designation>(`${this.apiUrl}/${id}`, designation, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.clearDesignationsCache()), // Clear cache when data changes
      catchError((error) => {
        console.error('Error in updateDesignation:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete designation (soft delete)
  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => this.clearDesignationsCache()), // Clear cache when data changes
      catchError((error) => {
        console.error('Error in deleteDesignation:', error);
        return throwError(() => error);
      })
    );
  }
}