import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { EmployeeService, Employee } from '../../shared/services/employee.service';
import { AuthService } from '../../shared/services/auth.service';

interface EmployeeProfile {
  employeeId: string;
  employeeFirstName: string;
  employeeMiddleName: string;
  employeeLastName: string;
  employeeDob: string;
  employeeEmail: string;
  employeePhone: string;
  employeeLocationHome: string;
  employeeIsActive: boolean;
  employeeFaceImage?: string;
}

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    DividerModule,
    AvatarModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './employee-profile.html',
  styleUrl: './employee-profile.css'
})
export class EmployeeProfileComponent implements OnInit {
  user: any = null;
  profile: EmployeeProfile | null = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  
  // Form data
  editForm: Partial<EmployeeProfile> = {};

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private employeeService: EmployeeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadProfile();
  }

  loadUserData() {
    // Check if user is authenticated
    if (!this.authService.isAuthenticatedSync()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get user data from AuthService
    this.user = this.authService.getUserData();
    
    // Fallback to punchInUser if user_data is not available
    if (!this.user) {
      const userData = localStorage.getItem('punchInUser');
      if (userData) {
        this.user = JSON.parse(userData);
      } else {
        this.router.navigate(['/login']);
      }
    }
  }

  loadProfile() {
    if (!this.user?.employeeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee ID not found. Please login again.',
        life: 4000
      });
      this.router.navigate(['/login']);
      return;
    }


    this.isLoading = true;
    this.employeeService.getEmployeeById(this.user.employeeId).subscribe({
      next: (employee: Employee) => {
        this.profile = {
          employeeId: employee.employeeId,
          employeeFirstName: employee.employeeFirstName,
          employeeMiddleName: employee.employeeMiddleName,
          employeeLastName: employee.employeeLastName,
          employeeDob: employee.employeeDob,
          employeeEmail: employee.employeeEmail,
          employeePhone: employee.employeePhone,
          employeeLocationHome: employee.employeeLocationHome,
          employeeIsActive: employee.employeeIsActive,
          employeeFaceImage: employee.employeeFaceImage
        };
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employee profile:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        
        let errorMessage = 'Failed to load employee profile. Please try again.';
        if (error.status === 403) {
          errorMessage = 'Access denied. Please check your authentication.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication expired. Please login again.';
          this.authService.logout();
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 4000
        });
        this.isLoading = false;
      }
    });
  }

  startEditing() {
    this.isEditing = true;
    // Only include editable fields in the edit form
    this.editForm = {
      employeeFirstName: this.profile?.employeeFirstName,
      employeeMiddleName: this.profile?.employeeMiddleName,
      employeeLastName: this.profile?.employeeLastName,
      employeeDob: this.profile?.employeeDob,
      employeePhone: this.profile?.employeePhone,
      employeeLocationHome: this.profile?.employeeLocationHome
    };
  }

  cancelEditing() {
    this.isEditing = false;
    this.editForm = {};
    this.messageService.add({
      severity: 'info',
      summary: 'Edit Cancelled',
      detail: 'Profile editing has been cancelled.',
      life: 3000
    });
  }

  saveProfile() {
    if (!this.profile || !this.editForm) {
      return;
    }

    this.isLoading = true;
    
    // Prepare the updated employee data for self-update
    const updatedEmployeeData = {
      employeeFirstName: this.editForm.employeeFirstName || this.profile.employeeFirstName,
      employeeMiddleName: this.editForm.employeeMiddleName || this.profile.employeeMiddleName || '',
      employeeLastName: this.editForm.employeeLastName || this.profile.employeeLastName,
      employeeDob: this.editForm.employeeDob || this.profile.employeeDob,
      employeePhone: this.editForm.employeePhone || this.profile.employeePhone,
      employeeLocationHome: this.editForm.employeeLocationHome || this.profile.employeeLocationHome
    };

    this.employeeService.updateEmployeeSelf(updatedEmployeeData).subscribe({
      next: (response) => {
        // Update local profile with the new data
        this.profile!.employeeFirstName = updatedEmployeeData.employeeFirstName;
        this.profile!.employeeMiddleName = updatedEmployeeData.employeeMiddleName;
        this.profile!.employeeLastName = updatedEmployeeData.employeeLastName;
        this.profile!.employeeDob = updatedEmployeeData.employeeDob;
        this.profile!.employeePhone = updatedEmployeeData.employeePhone;
        this.profile!.employeeLocationHome = updatedEmployeeData.employeeLocationHome;
        
        this.isEditing = false;
        this.editForm = {};
        this.isLoading = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Profile Updated',
          detail: 'Your profile has been successfully updated.',
          life: 4000
        });
      },
      error: (error) => {
        console.error('Error updating employee profile:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update profile. Please try again.',
          life: 4000
        });
        this.isLoading = false;
      }
    });
  }


  changePassword() {
    this.confirmationService.confirm({
      message: 'This will redirect you to the password change page. Continue?',
      header: 'Change Password',
      icon: 'pi pi-key',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Password Change',
          detail: 'Redirecting to password change page...',
          life: 3000
        });
        // In real app, navigate to password change component
      }
    });
  }

  uploadProfileImage() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (this.profile) {
            this.profile.employeeFaceImage = e.target.result;
            this.messageService.add({
              severity: 'success',
              summary: 'Image Updated',
              detail: 'Your profile image has been updated.',
              life: 3000
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  goBack() {
    this.router.navigate(['/employee/dashboard']);
  }

  getStatusSeverity(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}