import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PunchRecordRequest {
  employeeId: string;
  punchTimestamp: string;
  punchFaceUrl: string;
  punchFaceId: string; // face descriptor serialized as string
  punchLocationLong: number;
  punchLocationLat: number;
}

@Injectable({
  providedIn: 'root'
})
export class PunchService {
  private apiUrl = 'https://localhost:7127/api/PunchIn';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  punchIn(payload: PunchRecordRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}

