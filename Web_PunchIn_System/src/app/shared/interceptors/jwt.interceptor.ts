import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export function JwtInterceptor(request: HttpRequest<unknown>, next: HttpHandlerFn) {
  const router = inject(Router);
  const messageService = inject(MessageService);
  const authService = inject(AuthService);
  
  // Get token from localStorage
  const token = localStorage.getItem('jwt_token');
  
  // Clone the request and add the authorization header if token exists
  if (token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized errors
      if (error.status === 401) {
        authService.clearUserData(); // Clear all user data consistently
        router.navigate(['/login']);
        messageService.add({
          severity: 'error',
          summary: 'Session Expired',
          detail: 'Your session has expired. Please log in again.'
        });
      }
      return throwError(() => error);
    })
  );
}
