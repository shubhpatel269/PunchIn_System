import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface SessionTimeRequest {
  punchId: number;
  employeeId: string;
  sessionStatus: string;
  sessionStartTime: string;
  sessionEndTime: string | null;
  sessionLocationLong: number;
  sessionLocationLat: number;
  sessionBreakTime: string | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private apiUrl = 'https://localhost:7127/api/SessionTime';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  startSession(payload: SessionTimeRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}

