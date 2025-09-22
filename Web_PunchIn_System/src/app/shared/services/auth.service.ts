import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService
  ) { }

  // Check if user has a valid JWT token
  private hasToken(): boolean {
    return !!localStorage.getItem('jwt_token');
  }

  // Login with credentials
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post('https://localhost:7127/api/Auth/login', credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('jwt_token', response.token);
          localStorage.setItem('user_role', response.userRole);
          localStorage.setItem('user_data', JSON.stringify(response.user));
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

  // Employee face login
  faceLogin(faceDescriptor: number[]): Observable<any> {
    return this.http.post('https://localhost:7127/api/Auth/employee/login/face', { faceDescriptor }).pipe(
      tap((response: any) => {
        if (response && response.token) {
          localStorage.setItem('jwt_token', response.token);
          localStorage.setItem('user_role', response.userRole);
          localStorage.setItem('user_data', JSON.stringify(response.user));
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  // Logout the user
  logout() {
    this.clearUserData();
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

  // Get user role
  getUserRole(): string | null {
    return localStorage.getItem('user_role');
  }

  // Get user data
  getUserData(): any {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  // Check if user is admin or superadmin
  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'Admin' || role === 'SuperAdmin';
  }

  // Check if user is employee
  isEmployee(): boolean {
    const role = this.getUserRole();
    return role === 'Employee';
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  // Check if user is authenticated and has valid token
  isAuthenticatedSync(): boolean {
    if (!this.hasToken()) {
      return false;
    }
    
    // Check if token is expired
    if (this.isTokenExpired()) {
      this.clearUserData();
      return false;
    }
    
    return true;
  }

  // Check if JWT token is expired
  private isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    try {
      // Decode JWT token payload
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      // If token is malformed, consider it expired
      return true;
    }
  }

  // Decode JWT token payload
  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  // Clear all user data
  clearUserData() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');
    this.isAuthenticatedSubject.next(false);
  }
}
