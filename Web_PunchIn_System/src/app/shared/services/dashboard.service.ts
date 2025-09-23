import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Dashboard Statistics Interface
export interface DashboardStats {
  totalPunchInsToday: number;
  activeSessionsToday: number;
  employeesOnBreakToday: number;
  totalEmployees: number;
  employeesWhoPunchedInToday: number;
  attendanceRate: number;
}

// Today Punch-ins Interface
export interface TodayPunchIns {
  totalPunchIns: number;
  date: string;
}

// Active Session Interface
export interface ActiveSession {
  sessionId: number;
  employeeId: string;
  employeeName: string;
  sessionStartTime: string;
  sessionStatus: string;
}

export interface ActiveSessionsResponse {
  activeSessionCount: number;
  sessions: ActiveSession[];
}

// Employee on Break Interface
export interface EmployeeOnBreak {
  breakId: number;
  employeeId: string;
  employeeName: string;
  breakStart: string;
  breakType: string;
}

export interface EmployeesOnBreakResponse {
  employeesOnBreakCount: number;
  employees: EmployeeOnBreak[];
}

// Company Employee Count Interface
export interface CompanyEmployeeCount {
  companyId: number;
  companyName: string;
  totalEmployees: number;
  activeEmployees: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = 'https://localhost:7127/api/Employee/Dashboard';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Main Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/Stats`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Individual Metric Endpoints
  getTodayPunchIns(): Observable<TodayPunchIns> {
    return this.http.get<TodayPunchIns>(`${this.apiUrl}/TodayPunchIns`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getActiveSessions(): Observable<ActiveSessionsResponse> {
    return this.http.get<ActiveSessionsResponse>(`${this.apiUrl}/ActiveSessions`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getEmployeesOnBreak(): Observable<EmployeesOnBreakResponse> {
    return this.http.get<EmployeesOnBreakResponse>(`${this.apiUrl}/EmployeesOnBreak`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getCompanyEmployeeCount(companyId: number): Observable<CompanyEmployeeCount> {
    return this.http.get<CompanyEmployeeCount>(`${this.apiUrl}/CompanyEmployeeCount/${companyId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }
}