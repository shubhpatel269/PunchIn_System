import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService
  ) {}

  // Check if user has a valid JWT token
  private hasToken(): boolean {
    return !!localStorage.getItem('jwt_token');
  }

  // Login with credentials
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/Auth/admin/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('jwt_token', response.token);
          this.isAuthenticatedSubject.next(true);
          this.messageService.add({
            severity: 'success',
            summary: 'Login Successful',
            detail: 'Welcome back!',
            life: 3000
          });
        }
      })
    );
  }

  // Logout the user
  logout() {
    localStorage.removeItem('jwt_token');
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  // Check if user is authenticated
  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  // Get the current JWT token
  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }
}
