import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface BreakStartRequest {
  sessionId: number;
  employeeId: string;
  breakStart: string;
  breakEnd: string | null;
  breakType: string;
}

export interface BreakEndRequest {
  breakEnd: string;
  breakType: string;
}

@Injectable({ providedIn: 'root' })
export class BreakService {
  private apiUrl = 'https://punchinsystemapi.azurewebsites.net/api/Break';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  startBreak(payload: BreakStartRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }

  endBreak(breakId: number, payload: BreakEndRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${breakId}`, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}

