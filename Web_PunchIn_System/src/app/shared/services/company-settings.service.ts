import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface CompanySettings {
  companyId: number;
  workStartTime: string;
  workEndTime: string;
  graceLateMinutes: number;
  graceEarlyLeaveMinutes: number;
  allowHalfDay: boolean;
  halfDayHours: number;
  timeZone: string;
  breakTimeMinutes: number;
  isActive: boolean;
  createdDate: Date;
  updatedDate: Date;
}

export interface CreateCompanySettingsDto {
  companyId: number;
  workStartTime: string;
  workEndTime: string;
  graceLateMinutes: number;
  graceEarlyLeaveMinutes: number;
  allowHalfDay: boolean;
  halfDayHours: number;
  timeZone: string;
  breakTimeMinutes: number;
}

export interface UpdateCompanySettingsDto {
  workStartTime: string;
  workEndTime: string;
  graceLateMinutes: number;
  graceEarlyLeaveMinutes: number;
  allowHalfDay: boolean;
  halfDayHours: number;
  timeZone: string;
  breakTimeMinutes: number;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CompanySettingsService {
  private readonly apiUrl = 'https://localhost:7127/api/CompanySettings';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // GET: api/CompanySettings/{companyId}
  getCompanySettings(companyId: number): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(`${this.apiUrl}/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // POST: api/CompanySettings
  createCompanySettings(settings: CreateCompanySettingsDto): Observable<CompanySettings> {
    return this.http.post<CompanySettings>(`${this.apiUrl}`, settings, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // PUT: api/CompanySettings/{companyId}
  updateCompanySettings(companyId: number, settings: UpdateCompanySettingsDto): Observable<CompanySettings> {
    return this.http.put<CompanySettings>(`${this.apiUrl}/${companyId}`, settings, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // DELETE: api/CompanySettings/{companyId}
  deleteCompanySettings(companyId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Get available timezones
  getAvailableTimeZones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
  }

  // Validate time format
  validateTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Convert time string to TimeSpan format for API
  convertToTimeSpan(timeString: string): string {
    // Ensure time is in HH:MM format
    const timeParts = timeString.split(':');
    const hours = timeParts[0].padStart(2, '0');
    const minutes = timeParts[1].padStart(2, '0');
    return `${hours}:${minutes}:00`;
  }

  // Convert TimeSpan from API to time string
  convertFromTimeSpan(timeSpan: string): string {
    // Remove seconds part if present
    return timeSpan.substring(0, 5);
  }
}
