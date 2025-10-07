import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface CompanyProfile {
  companyId: number;
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyCreatedAt: Date;
  companyCreatedBySuperadminId: number;
  companyIsDeleted: boolean;
  companyDeletedAt: Date;
  companyDeletedBySuperadminId: number;
}

export interface CreateCompanyDto {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
}

export interface UpdateCompanyDto {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyProfileService {
  private readonly apiUrl = 'https://localhost:7127/api/Company';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // GET: api/Company/{companyId}
  getCompanyProfile(companyId: number): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.apiUrl}/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // GET: api/Company (for SuperAdmin and Admin)
  getCompanies(): Observable<CompanyProfile[]> {
    return this.http.get<CompanyProfile[]>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // POST: api/Company
  createCompany(company: CreateCompanyDto): Observable<CompanyProfile> {
    return this.http.post<CompanyProfile>(`${this.apiUrl}`, company, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // PUT: api/Company/{companyId}
  updateCompany(companyId: number, company: UpdateCompanyDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${companyId}`, company, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // DELETE: api/Company/{companyId}
  deleteCompany(companyId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${companyId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // POST: api/Company/register (public registration)
  registerCompany(registrationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, registrationData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  // Get available company types
  getAvailableCompanyTypes(): string[] {
    return [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Retail',
      'Manufacturing',
      'Consulting',
      'Real Estate',
      'Transportation',
      'Energy',
      'Media',
      'Telecommunications',
      'Other'
    ];
  }

  // Validate email format
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
  }

  // Format company address
  formatCompanyAddress(company: CompanyProfile): string {
    const parts = [
      company.companyAddress,
      company.companyCity,
      company.companyState
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  }

  // Get company display name
  getCompanyDisplayName(company: CompanyProfile): string {
    return company.companyName || 'Unnamed Company';
  }
}
