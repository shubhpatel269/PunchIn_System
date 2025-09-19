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

// New interfaces for attendance summary API
export interface SessionRecord {
  sessionId: number;
  punchId: number;
  sessionStatus: string;
  sessionStartTime: string;
  sessionEndTime: string | null;
  sessionLocationLong: number;
  sessionLocationLat: number;
  sessionBreakTime: string | null;
  sessionDuration: string;
  breakCount: number;
  totalBreakDuration: string;
}

export interface AttendanceRecordDTO {
  date: string;
  day: string;
  sessions: SessionRecord[];
}

export interface AttendanceSummaryResponse {
  employeeId: string;
  records: AttendanceRecordDTO[];
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  // private apiUrl = 'https://punchinsystemapi.azurewebsites.net/api/Attendance';
  private apiUrl = 'https://localhost:7127/api/Attendance';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getRecentAttendance(employeeId: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/Recent/${employeeId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }

  getAttendanceSummary(employeeId: string, from?: Date, to?: Date): Observable<AttendanceSummaryResponse> {
    let url = `${this.apiUrl}/Summary/${employeeId}`;
    const params = new URLSearchParams();
    
    if (from) {
      params.append('from', from.toISOString().split('T')[0]);
    }
    if (to) {
      params.append('to', to.toISOString().split('T')[0]);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.http.get<AttendanceSummaryResponse>(url, { headers: this.getAuthHeaders() })
      .pipe(catchError(error => throwError(() => error)));
  }
}