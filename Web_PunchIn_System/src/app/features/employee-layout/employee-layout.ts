import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SessionService } from '../../shared/services/session.service';
import { LocationLogService } from '../../shared/services/location-log.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { AuthService } from '../../shared/services/auth.service';

interface LocationLog {
  timestamp: string;
  lat: number;
  long: number;
}

@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    ButtonModule,
    AvatarModule,
    DividerModule,
    ToastModule,
    ConfirmPopupModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './employee-layout.html',
  styleUrl: './employee-layout.css'
})
export class EmployeeLayoutComponent implements OnInit, OnDestroy {
  user: any = null;
  
  // Location tracking properties
  locationLogs: LocationLog[] = [];
  private locationInterval: any;
  private locationPermission: boolean = true;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private sessionService: SessionService,
    private locationLogService: LocationLogService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.performSoftReload();
    
    // Start location tracking for active session
    this.startLocationTracking();
  }

  loadUserData() {
    const userData = this.authService.getUserData();
    if (userData) {
      this.user = userData;
    } else {
      this.router.navigate(['/login']);
    }
  }

  performSoftReload() {
    // Check if this is the first time entering employee section after login
    const hasReloaded = sessionStorage.getItem('employeeSoftReloaded');
    
    if (!hasReloaded) {
      // Mark that we've performed the soft reload
      sessionStorage.setItem('employeeSoftReloaded', 'true');
      
      // Perform soft reload after a short delay to ensure component is initialized
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }

  confirmLogout(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure you want to logout?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, Logout',
      rejectLabel: 'Cancel',
      accept: () => {
        this.logout();
      },
      reject: () => {
        // User cancelled logout
      }
    });
  }

  logout() {
    const activePunchIdStr = localStorage.getItem('activePunchId');
    const punchId = activePunchIdStr ? parseInt(activePunchIdStr, 10) : null;
    const userData = this.authService.getUserData?.();
    const employeeId = userData?.employeeId || this.user?.employeeId;
    const sessionIdStr = localStorage.getItem('activeSessionId');
    const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
    const lat = 0;
    const long = 0;

    if (sessionId) {
      const payload = {
        sessionStatus: 'completed',
        sessionEndTime: new Date().toISOString(),
        sessionBreakTime: null
      };

      this.sessionService.endSession(sessionId, payload).subscribe({
        next: () => {
          localStorage.removeItem('activePunchId');
          localStorage.removeItem('activeSessionId');
          sessionStorage.removeItem('employeeSoftReloaded'); // Clear soft reload flag
          this.authService.logout();
          this.messageService.add({ severity: 'info', summary: 'Logged Out', detail: 'Session ended and logged out.', life: 3000 });
        },
        error: () => {
          // proceed with logout even if session end fails
          sessionStorage.removeItem('employeeSoftReloaded'); // Clear soft reload flag
          this.authService.logout();
          this.messageService.add({ severity: 'warn', summary: 'Logged Out', detail: 'Logout done. Session end failed.', life: 3000 });
        }
      });
    } else {
      sessionStorage.removeItem('employeeSoftReloaded'); // Clear soft reload flag
      this.authService.logout();
      this.messageService.add({ severity: 'info', summary: 'Logged Out', detail: 'You have been successfully logged out.', life: 3000 });
    }
  }

  ngOnDestroy() {
    // Stop location tracking
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
      this.locationInterval = null;
    }
  }

  startLocationTracking() {
    const sessionIdStr = localStorage.getItem('activeSessionId');
    const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
    
    if (!sessionId) {
      return;
    }
    
    // Start location tracking with 30-minute interval
    this.locationInterval = setInterval(() => {
      this.trackUserLocation();
    }, 30 * 60 * 1000); // 30 minutes
  }

  trackUserLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const log: LocationLog = {
          timestamp: new Date().toLocaleString(),
          lat: position.coords.latitude,
          long: position.coords.longitude
        };
        this.locationLogs.push(log);

        try {
          const sessionIdStr = localStorage.getItem('activeSessionId');
          const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
          const employeeId = this.user?.employeeId || JSON.parse(localStorage.getItem('punchInUser') || '{}')?.employeeId;
          
          if (sessionId && employeeId) {
            const payload = {
              sessionId: sessionId,
              employeeId: employeeId,
              logTimestamp: new Date().toISOString(),
              locationLong: log.long,
              locationLat: log.lat
            };
            
            this.locationLogService.createLog(payload).subscribe({
              next: () => {
                // Location log sent successfully
              },
              error: (err) => {
                // Failed to send location log
              }
            });
          }
        } catch (e) {
          // Error processing location log
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Location Tracking Error',
          detail: 'Unable to access location. Please check your browser permissions.',
          life: 3000
        });
        this.locationPermission = false;
      }
    );
  }
}