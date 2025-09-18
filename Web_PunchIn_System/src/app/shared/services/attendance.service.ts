import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AttendanceRecord {
  date: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  totalHours: string;
  totalBreak: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private apiUrl = 'https://localhost:7127/api/Attendance/Recent';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getRecentAttendance(employeeId: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/${employeeId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}