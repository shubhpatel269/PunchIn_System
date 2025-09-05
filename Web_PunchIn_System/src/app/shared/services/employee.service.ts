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
      'Authorization': `Bearer ${token}`
    });
  }

  createEmployee(employee: Employee): Observable<any> {
    return this.http.post(this.apiUrl, employee, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}