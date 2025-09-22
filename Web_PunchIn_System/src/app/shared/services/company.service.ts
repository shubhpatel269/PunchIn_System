import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface CompanyProfile {
  companyId: number;
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyCreatedAt?: string;
  companyCreatedBySuperadminId?: number;
  companyIsDeleted?: boolean;
  companyDeletedAt?: string;
  companyDeletedBySuperadminId?: number;
}

export interface CompanyUpdateRequest {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
}

export interface CompanyRegistrationData {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  adminFirstName: string;
  adminMiddleName: string | null;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
  adminDob: string;
}

export interface RegistrationResponse {
  companyId: number;
  companyName: string;
  adminId: number;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  createdAt: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly baseUrl = 'https://localhost:7127/api/Company';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getCompany(): Observable<CompanyProfile | CompanyProfile[]> {
    return this.http
      .get<CompanyProfile | CompanyProfile[]>(`${this.baseUrl}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateCompany(companyId: number, payload: CompanyUpdateRequest): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/${companyId}`, payload, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  registerCompany(payload: CompanyRegistrationData): Observable<RegistrationResponse> {
    return this.http
      .post<RegistrationResponse>(`${this.baseUrl}/register`, payload)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}

