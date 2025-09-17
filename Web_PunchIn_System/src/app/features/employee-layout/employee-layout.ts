import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SessionService } from '../../shared/services/session.service';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { AuthService } from '../../shared/services/auth.service';

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
export class EmployeeLayoutComponent implements OnInit {
  user: any = null;

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private sessionService: SessionService
  ) {}

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const userData = this.authService.getUserData();
    if (userData) {
      this.user = userData;
    } else {
      this.router.navigate(['/login']);
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
          this.authService.logout();
          this.messageService.add({ severity: 'info', summary: 'Logged Out', detail: 'Session ended and logged out.', life: 3000 });
        },
        error: () => {
          // proceed with logout even if session end fails
          this.authService.logout();
          this.messageService.add({ severity: 'warn', summary: 'Logged Out', detail: 'Logout done. Session end failed.', life: 3000 });
        }
      });
    } else {
      this.authService.logout();
      this.messageService.add({ severity: 'info', summary: 'Logged Out', detail: 'You have been successfully logged out.', life: 3000 });
    }
  }
}