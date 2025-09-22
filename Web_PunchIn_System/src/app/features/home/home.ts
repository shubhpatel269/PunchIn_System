import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    CardModule, 
    ButtonModule,  
    ToastModule, 
    ConfirmPopupModule,
    AvatarModule,
    DividerModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  userData: any = {
    name: '',
    employeeId: '',
    email: '',
    mobile: '',
    location: '',
    punchedTime: ''
  };

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private router: Router
  ) { }

  ngOnInit() {
    
    const data = localStorage.getItem('punchInUser');
    if (data) {
      try {
        this.userData = JSON.parse(data);
        
        // Stay on home page to show dashboard with navigation
      } catch (error) {
        
        this.router.navigate(['/login']);
      }
    } else {
      
      this.router.navigate(['/login']);
    }
  }

  onLogout() {
    const activePunchIdStr = localStorage.getItem('activePunchId');
    const punchId = activePunchIdStr ? parseInt(activePunchIdStr, 10) : null;
    const userData = this.userData;
    const employeeId = userData?.employeeId;
    const sessionIdStr = localStorage.getItem('activeSessionId');
    const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
    const lat = 0;
    const long = 0;

    const proceed = () => {
    localStorage.removeItem('punchInUser');
      localStorage.removeItem('activePunchId');
      this.router.navigateByUrl('/login', { skipLocationChange: false }).catch(err => {
        
      window.location.href = '/login';
    });
    };

    if (sessionId) {
      // Lazy import to avoid tight coupling; service is providedIn root
      import('../../shared/services/session.service').then(({ SessionService }) => {
        const injector = (window as any).ng && (window as any).ng.getInjector && (window as any).ng.getInjector(this as any);
        // Fallback: proceed if injector not available in this context
        if (!injector) { proceed(); return; }
        const sessionService = injector.get(SessionService);
        const payload = {
          sessionStatus: 'completed',
          sessionEndTime: new Date().toISOString(),
          sessionBreakTime: null
        };
        sessionService.endSession(sessionId, payload).subscribe({ next: proceed, error: proceed });
      }).catch(() => proceed());
    } else {
      proceed();
    }
  }

  confirmBackToLogin(event: Event) {
    
    
    this.confirmationService.confirm({
      target: event.target as HTMLElement,
      message: 'Are you sure you want to return to the login page?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      accept: () => {
        this.onLogout();
      }
    });
  }

  goToEmployeeDashboard() {
    this.router.navigate(['/employee/dashboard']);
  }

  goToEmployeeProfile() {
    this.router.navigate(['/employee/profile']);
  }

  goToEmployeeAttendance() {
    this.router.navigate(['/employee/attendance']);
  }
}