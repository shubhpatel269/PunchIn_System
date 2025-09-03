import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MessageService } from 'primeng/api';

// PrimeNG Components
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface CompanyRegistrationData {
  companyName: string;
  contactNo: string;
  companyEmail: string;
  companyType: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  adminFirstName: string;
  adminMiddleName: string | null;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
  adminDob: string;
}

interface RegistrationResponse {
  companyId: number;
  companyName: string;
  adminId: number;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  createdAt: string;
  message: string;
}

@Component({
  selector: 'app-company-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    StepperModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    CardModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: './company-register.html'
})
export class CompanyRegister implements OnInit {
  
  // Stepper
  activeStep = 0;
  
  // Forms
  companyForm!: FormGroup;
  adminForm!: FormGroup;
  
  // Loading states
  isSubmitting = false;
  
  // Date picker max date
  maxDate = new Date();
  
  // Success data
  registrationResponse: RegistrationResponse | null = null;
  
  // Step completion tracking
  completedSteps: Set<number> = new Set();
  
  // Company types dropdown
  companyTypes = [
    { label: 'Technology', value: 'Technology' },
    { label: 'Manufacturing', value: 'Manufacturing' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Education', value: 'Education' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Retail', value: 'Retail' },
    { label: 'Food & Beverage', value: 'Food & Beverage' },
    { label: 'Water bottle', value: 'Water bottle' },
    { label: 'Other', value: 'Other' }
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeForms();
  }

  initializeForms() {
    // Company Details Form
    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2)]],
      contactNo: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      companyEmail: ['', [Validators.required, Validators.email]],
      companyType: ['', Validators.required],
      companyAddress: ['', [Validators.required, Validators.minLength(10)]],
      companyCity: ['', [Validators.required, Validators.minLength(2)]],
      companyState: ['', [Validators.required, Validators.minLength(2)]]
    });

    // Admin Details Form
    this.adminForm = this.fb.group({
      adminFirstName: ['', [Validators.required, Validators.minLength(2)]],
      adminMiddleName: [''],
      adminLastName: ['', [Validators.required, Validators.minLength(2)]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]],
      adminPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      adminDob: ['', Validators.required]
    });
  }



  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  async submitRegistration() {
    this.isSubmitting = true;
    
    try {
      // Format the data properly for the API
      const registrationData: CompanyRegistrationData = {
        companyName: this.companyForm.get('companyName')?.value?.trim(),
        contactNo: this.companyForm.get('contactNo')?.value?.trim(),
        companyEmail: this.companyForm.get('companyEmail')?.value?.trim(),
        companyType: this.companyForm.get('companyType')?.value,
        companyAddress: this.companyForm.get('companyAddress')?.value?.trim(),
        companyCity: this.companyForm.get('companyCity')?.value?.trim(),
        companyState: this.companyForm.get('companyState')?.value?.trim(),
        adminFirstName: this.adminForm.get('adminFirstName')?.value?.trim(),
        adminMiddleName: this.adminForm.get('adminMiddleName')?.value?.trim() || null,
        adminLastName: this.adminForm.get('adminLastName')?.value?.trim(),
        adminEmail: this.adminForm.get('adminEmail')?.value?.trim(),
        adminPassword: this.adminForm.get('adminPassword')?.value,
        adminPhone: this.adminForm.get('adminPhone')?.value?.trim(),
        adminDob: this.formatDateForAPI(this.adminForm.get('adminDob')?.value)
      };

      console.log('Sending registration data:', registrationData);

      const response = await this.http.post<RegistrationResponse>(
        'https://localhost:7127/api/Company/register',
        registrationData
      ).toPromise();

      this.registrationResponse = response!;
      this.activeStep = 2;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Registration Successful',
        detail: 'Company has been registered successfully!'
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.status === 400 && error.error?.errors) {
        // Handle validation errors from the server
        const validationErrors = error.error.errors;
        const errorMessages = Object.keys(validationErrors).map(key => 
          `${key}: ${validationErrors[key].join(', ')}`
        );
        errorMessage = `Validation errors: ${errorMessages.join('; ')}`;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.title) {
        errorMessage = error.error.title;
      }
      
      this.messageService.add({
        severity: 'error',
        summary: 'Registration Failed',
        detail: errorMessage
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  private formatDateForAPI(date: any): string {
    if (!date) return '';
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    }
    
    if (typeof date === 'string') {
      return date;
    }
    
    return '';
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }

  // Step completion validation
  isStepCompleted(stepIndex: number): boolean {
    return this.completedSteps.has(stepIndex);
  }

  // New stepper navigation methods
  nextStep() {
    if (this.activeStep === 0) {
      if (this.companyForm.valid) {
        this.completedSteps.add(0); // Mark step 0 as completed
        this.activeStep = 1;
      } else {
        this.markFormGroupTouched(this.companyForm);
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill all required company details correctly.'
        });
      }
    } else if (this.activeStep === 1) {
      if (this.adminForm.valid) {
        this.completedSteps.add(1); // Mark step 1 as completed
        this.submitRegistration();
      } else {
        this.markFormGroupTouched(this.adminForm);
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation Error',
          detail: 'Please fill all required admin details correctly.'
        });
      }
    }
  }

  prevStep() {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  // Handle step click - only allow if step is completed or it's the current step
  onStepClick(stepIndex: number) {
    if (stepIndex === this.activeStep) {
      return; // Already on this step
    }
    
    if (stepIndex < this.activeStep) {
      // Allow going back to previous steps
      this.activeStep = stepIndex;
    } else if (this.isStepCompleted(stepIndex - 1)) {
      // Allow going forward only if previous step is completed
      this.activeStep = stepIndex;
    } else {
      // Show warning message
      this.messageService.add({
        severity: 'warn',
        summary: 'Step Locked',
        detail: 'Please complete the previous step before proceeding.'
      });
    }
  }

  // Helper methods for form validation
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return 'Please enter a valid format';
    }
    return '';
  }
}