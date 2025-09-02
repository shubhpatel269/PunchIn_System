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
    console.log('Home component initialized');
    const data = localStorage.getItem('punchInUser');
    if (data) {
      try {
        this.userData = JSON.parse(data);
        console.log('User data loaded:', this.userData);
        // Stay on home page to show dashboard with navigation
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.router.navigate(['/login']);
      }
    } else {
      console.warn('No user data found in localStorage');
      this.router.navigate(['/login']);
    }
  }

  onLogout() {
    localStorage.removeItem('punchInUser');
    
    this.router.navigateByUrl('/login', { skipLocationChange: false }).then(() => {
    }).catch(err => {
      console.error('Navigation error:', err);
      window.location.href = '/login';
    });
  }

  confirmBackToLogin(event: Event) {
    console.log('Confirmation dialog triggered');
    
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