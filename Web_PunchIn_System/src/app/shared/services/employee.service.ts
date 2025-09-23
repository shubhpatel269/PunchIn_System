import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Employee {
  employeeId: string;
  companyId: number;
  employeeDesignationId: number;
  employeeFirstName: string;
  employeeMiddleName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeeDob: string;
  employeePhone: string;
  employeeFaceImage: string;
  employeeFaceId: string;
  employeeLocationHome: string;
  employeeIsActive: boolean;
}

export interface TodayStatus {
  employeeId: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  isOnBreak: boolean;
  totalBreakDuration: string; // HH:MM:SS
  elapsedWorkDuration: string; // HH:MM:SS
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = 'https://localhost:7127/api/Employee';

  constructor(private http: HttpClient) { }

  private getAuthHeaders() {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  createEmployee(employee: Employee): Observable<any> {
    return this.http.post(this.apiUrl, employee, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  getEmployeeById(employeeId: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${employeeId}`, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateEmployee(employeeId: string, employee: Employee): Observable<any> {
    return this.http.put(`${this.apiUrl}/${employeeId}`, employee, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  updateEmployeeSelf(employeeData: Partial<Employee>): Observable<any> {
    return this.http.put(`${this.apiUrl}/Self`, employeeData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  deleteEmployee(employeeId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${employeeId}`, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  // New: Today's Status (self)
  getSelfTodayStatus(): Observable<TodayStatus> {
    return this.http.get<TodayStatus>(`${this.apiUrl}/Self/TodayStatus`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // New: Today's Status (admin viewing employee)
  getTodayStatusForEmployee(employeeId: string): Observable<TodayStatus> {
    return this.http.get<TodayStatus>(`${this.apiUrl}/TodayStatus/${employeeId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}