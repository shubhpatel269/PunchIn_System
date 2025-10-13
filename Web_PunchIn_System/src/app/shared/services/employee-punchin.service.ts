import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface PunchInDetail {
  punchId: number;
  punchTimestamp: string;
  punchFaceUrl: string;
  punchFaceId: string;
  punchLocationLong: number;
  punchLocationLat: number;
  punchCreatedAt?: string;
  punchUpdatedAt?: string;
}

export interface EmployeePunchInData {
  employeeId: string;
  employeeFirstName: string;
  employeeMiddleName?: string;
  employeeLastName: string;
  employeeEmail: string;
  employeeFaceImage?: string;
  employeeFaceId?: string;
  punchIns: PunchInDetail[];
}

@Injectable({
  providedIn: 'root'
})
export class EmployeePunchInService {
  private readonly baseUrl = 'https://localhost:7127/api/Employee';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getEmployeePunchIns(employeeId: string): Observable<EmployeePunchInData> {
    return this.http
      .get<EmployeePunchInData>(`${this.baseUrl}/${employeeId}/PunchIns`, { 
        headers: this.getAuthHeaders() 
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}
