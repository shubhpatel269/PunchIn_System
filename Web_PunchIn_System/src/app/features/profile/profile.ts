import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../shared/services/auth.service';

interface CompanyProfile {
  companyId: number;
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyCreatedAt: string;
  companyCreatedBySuperadminId: number;
  companyIsDeleted: boolean;
  companyDeletedAt: string;
  companyDeletedBySuperadminId: number;
}

interface CompanyUpdateRequest {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {
  companyForm: FormGroup;
  loading = false;
  isUpdating = false;
  companyData: CompanyProfile | null = null;


  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactNo: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyType: ['', Validators.required],
      companyAddress: ['', [Validators.required, Validators.minLength(10)]],
      companyCity: ['', [Validators.required, Validators.minLength(2)]],
      companyState: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit() {
    this.loadCompanyProfile();
  }

  loadCompanyProfile() {
    this.loading = true;
    const token = this.authService.getToken();
    
    if (!token) {
      this.messageService.add({
        severity: 'error',
        summary: 'Authentication Error',
        detail: 'No authentication token found. Please login again.',
        life: 5000
      });
      this.loading = false;
      return;
    }
    
    this.http.get<CompanyProfile | CompanyProfile[]>('https://localhost:7127/api/Company', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (data) => {
        // Handle array response - take the first item
        const companyData = Array.isArray(data) ? data[0] : data;
        
        if (!companyData) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No company data found in response.',
            life: 5000
          });
          this.loading = false;
          return;
        }
        
        this.companyData = companyData;
        this.populateForm(companyData);
        this.loading = false;
      },
      error: (error) => {
        let errorMessage = 'Failed to load company profile. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.status === 404) {
          errorMessage = 'Company profile not found.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  populateForm(data: CompanyProfile) {
    // Ensure all fields are properly mapped
    const formData = {
      companyName: data.companyName || '',
      contactNo: data.contactNo || '',
      companyEmail: data.companyEmail || '',
      companyType: data.companyType || '',
      companyAddress: data.companyAddress || '',
      companyCity: data.companyCity || '',
      companyState: data.companyState || ''
    };
    
    this.companyForm.patchValue(formData);
    
    // Mark form as pristine after populating
    this.companyForm.markAsPristine();
    this.companyForm.markAsUntouched();
  }

  onSubmit() {
    if (this.companyForm.valid) {
      this.isUpdating = true;
      const token = this.authService.getToken();
      const updateData: CompanyUpdateRequest = this.companyForm.value;

      // Check if we have company data with ID
      if (!this.companyData || !this.companyData.companyId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Company ID not found. Please refresh the page and try again.',
          life: 5000
        });
        this.isUpdating = false;
        return;
      }

      const companyId = this.companyData.companyId;

      this.http.put(`https://localhost:7127/api/Company/${companyId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Company profile updated successfully!',
            life: 5000
          });
          this.isUpdating = false;
          // Reload the profile to get updated data
          this.loadCompanyProfile();
        },
        error: (error) => {
          let errorMessage = 'Failed to update company profile. Please try again.';
          if (error.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (error.status === 404) {
            errorMessage = 'Company not found.';
          } else if (error.status === 400) {
            errorMessage = 'Invalid data provided. Please check your inputs.';
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          this.isUpdating = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm() {
    if (this.companyData) {
      this.populateForm(this.companyData);
    } else {
      this.companyForm.reset();
    }
  }

  markFormGroupTouched() {
    Object.keys(this.companyForm.controls).forEach(key => {
      const control = this.companyForm.get(key);
      control?.markAsTouched();
    });
  }

} 