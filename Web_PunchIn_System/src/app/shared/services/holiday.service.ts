import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CompanySettings {
  companyId: number;
  workStartTime: string;
  workEndTime: string;
  graceLateMinutes: number;
  graceEarlyLeaveMinutes: number;
  allowHalfDay: boolean;
  halfDayHours: number;
  timeZone: string;
  isActive: boolean;
  createdDate: Date;
  updatedDate: Date;
}

export interface CompanyHoliday {
  holidayId: number;
  companyId: number;
  holidayDate: Date;
  holidayName: string;
  isPaid: boolean;
  isActive: boolean;
  createdDate: Date;
}

export interface CreateHolidayDto {
  companyId: number;
  holidayDate: Date;
  holidayName: string;
  isPaid: boolean;
}


export interface CreateWeekendHolidayDto {
  companyId: number;
  year: number;
  includeSunday: boolean;
  includeMonday: boolean;
  includeTuesday: boolean;
  includeWednesday: boolean;
  includeThursday: boolean;
  includeFriday: boolean;
  includeSaturday: boolean;
  isPaid: boolean;
}

export interface DeleteBulkHolidayDto {
  companyId: number;
  holidayIds: number[];
}

export interface BulkHolidayResult {
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface HolidayCheck {
  isHoliday: boolean;
  holidayName?: string;
  isPaid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private apiUrl = 'https://localhost:7127/api';
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Company Settings Methods
  getCompanySettings(companyId: number): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(`${this.apiUrl}/CompanySettings/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createCompanySettings(settings: Partial<CompanySettings>): Observable<CompanySettings> {
    return this.http.post<CompanySettings>(`${this.apiUrl}/CompanySettings`, settings, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateCompanySettings(companyId: number, settings: Partial<CompanySettings>): Observable<CompanySettings> {
    return this.http.put<CompanySettings>(`${this.apiUrl}/CompanySettings/${companyId}`, settings, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteCompanySettings(companyId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/CompanySettings/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Holiday Methods
  getCompanyHolidays(companyId: number, year?: number): Observable<CompanyHoliday[]> {
    let url = `${this.apiUrl}/CompanyHoliday/${companyId}`;
    if (year) {
      url += `?year=${year}`;
    }
    
    return this.http.get<CompanyHoliday[]>(url, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getCompanyHolidaysByMonth(companyId: number, year: number, month: number): Observable<CompanyHoliday[]> {
    return this.http.get<CompanyHoliday[]>(`${this.apiUrl}/CompanyHoliday/${companyId}/month/${year}/${month}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  checkHoliday(companyId: number, date: Date): Observable<HolidayCheck> {
    const dateStr = date.toISOString().split('T')[0];
    return this.http.get<HolidayCheck>(`${this.apiUrl}/CompanyHoliday/${companyId}/check/${dateStr}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createHoliday(holiday: CreateHolidayDto): Observable<CompanyHoliday> {
    return this.http.post<CompanyHoliday>(`${this.apiUrl}/CompanyHoliday`, holiday, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  createAllDayHolidays(weekendData: CreateWeekendHolidayDto): Observable<BulkHolidayResult> {
    return this.http.post<BulkHolidayResult>(`${this.apiUrl}/CompanyHoliday/all-days`, weekendData, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }


  updateHoliday(holidayId: number, holiday: Partial<CompanyHoliday>): Observable<CompanyHoliday> {
    return this.http.put<CompanyHoliday>(`${this.apiUrl}/CompanyHoliday/${holidayId}`, holiday, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteHoliday(holidayId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/CompanyHoliday/${holidayId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  deleteBulkHolidays(companyId: number, holidayIds: number[]): Observable<BulkHolidayResult> {
    const payload: DeleteBulkHolidayDto = {
      companyId,
      holidayIds
    };
    
    return this.http.delete<BulkHolidayResult>(`${this.apiUrl}/CompanyHoliday/bulk`, {
      headers: this.getAuthHeaders(),
      body: payload
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }


  // Utility Methods
  isWorkingDay(companyId: number, date: Date): Observable<boolean> {
    return this.checkHoliday(companyId, date).pipe(
      map(result => !result.isHoliday),
      catchError(error => throwError(() => error))
    );
  }

  getHolidayStatistics(companyId: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/CompanyHoliday/${companyId}/statistics?year=${year}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Helper method to format dates for API
  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Helper method to parse API dates
  private parseApiDate(dateStr: string): Date {
    return new Date(dateStr);
  }
}
