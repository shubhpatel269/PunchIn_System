import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const EmployeeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticatedSync()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user is employee
  if (!authService.isEmployee()) {
    // Redirect to appropriate dashboard based on role
    if (authService.isAdmin()) {
      router.navigate(['/admin/dashboard']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }

  return true;
};