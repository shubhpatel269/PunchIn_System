import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface LocationLogRequest {
  sessionId: number;
  employeeId: string;
  logTimestamp: string;
  locationLong: number;
  locationLat: number;
}

@Injectable({ providedIn: 'root' })
export class LocationLogService {
  private apiUrl = 'https://localhost:7127/api/LocationLog';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  createLog(payload: LocationLogRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}

