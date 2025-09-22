import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticatedSync()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user is admin
  if (!authService.isAdmin()) {
    // Redirect to appropriate dashboard based on role
    if (authService.isEmployee()) {
      router.navigate(['/employee/dashboard']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }

  return true;
};