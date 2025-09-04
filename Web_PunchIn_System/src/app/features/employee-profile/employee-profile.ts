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

interface EmployeeProfile {
  employeeId: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
  employeePhone: string;
  employeeAddress: string;
  employeeDepartment: string;
  employeePosition: string;
  employeeHireDate: Date;
  employeeSalary: number;
  employeeStatus: string;
  profileImage?: string;
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
  
  // Dropdown options
  departments = [
    { label: 'Human Resources', value: 'HR' },
    { label: 'Information Technology', value: 'IT' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Operations', value: 'Operations' },
    { label: 'Sales', value: 'Sales' }
  ];

  positions = [
    { label: 'Software Developer', value: 'Software Developer' },
    { label: 'Senior Developer', value: 'Senior Developer' },
    { label: 'Team Lead', value: 'Team Lead' },
    { label: 'Project Manager', value: 'Project Manager' },
    { label: 'Business Analyst', value: 'Business Analyst' },
    { label: 'UI/UX Designer', value: 'UI/UX Designer' }
  ];

  statuses = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'On Leave', value: 'On Leave' }
  ];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadProfile();
  }

  loadUserData() {
    const userData = localStorage.getItem('punchInUser');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProfile() {
    // Mock profile data - in real app, this would come from API
    this.profile = {
      employeeId: this.user?.employeeId || 'EMP001',
      employeeFirstName: this.user?.name?.split(' ')[0] || 'John',
      employeeLastName: this.user?.name?.split(' ')[1] || 'Doe',
      employeeEmail: this.user?.email || 'john.doe@company.com',
      employeePhone: this.user?.mobile || '+1 (555) 123-4567',
      employeeAddress: '123 Main Street, City, State 12345',
      employeeDepartment: 'IT',
      employeePosition: 'Software Developer',
      employeeHireDate: new Date('2023-01-15'),
      employeeSalary: 75000,
      employeeStatus: 'Active',
      profileImage: ''
    };
  }

  startEditing() {
    this.isEditing = true;
    this.editForm = { ...this.profile };
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
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      if (this.profile && this.editForm) {
        this.profile = { ...this.profile, ...this.editForm };
        this.isEditing = false;
        this.editForm = {};
        this.isLoading = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Profile Updated',
          detail: 'Your profile has been successfully updated.',
          life: 4000
        });
      }
    }, 1500);
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
            this.profile.profileImage = e.target.result;
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

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'danger';
      case 'On Leave': return 'warning';
      default: return 'secondary';
    }
  }

  getDepartmentLabel(deptCode: string): string {
    const dept = this.departments.find(d => d.value === deptCode);
    return dept ? dept.label : deptCode;
  }
}