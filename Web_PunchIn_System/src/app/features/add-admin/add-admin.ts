import { Component, Inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { CompanyAdminService } from '../../shared/services/company-admin.service';

@Component({
  selector: 'app-add-admin',
  standalone: true,
  imports: [CardModule, InputTextModule, ButtonModule, ReactiveFormsModule, ToastModule, DatePicker],
  templateUrl: './add-admin.html',
  styleUrls: ['./add-admin.css']
})
export class AddAdmin implements OnInit {
  adminForm: FormGroup;
  isEditMode: boolean = false;
  loading: boolean = false;
  maxDate = new Date();
  formInitialized = false;


  constructor(
    private fb: FormBuilder,
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    public messageService: MessageService,
    private companyAdminService: CompanyAdminService
  ) {
    this.isEditMode = config?.data?.admin ? true : false;
    
    this.adminForm = this.fb.group({
      adminFirstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z\\s]*$')]],
      adminMiddleName: [''],
      adminLastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z\\s]*$')]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      adminPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      adminDob: ['', Validators.required],
      isActive: [true]
    });

    if (this.isEditMode && config.data.admin) {
      // Handle date formatting for edit mode
      const adminData = { ...config.data.admin };
      console.log('Edit mode - original admin data:', adminData);
      if (adminData.adminDob) {
        // Convert string date to Date object for display
        console.log('Original date string:', adminData.adminDob);
        adminData.adminDob = new Date(adminData.adminDob);
        console.log('Converted to Date object:', adminData.adminDob);
      }
      this.adminForm.patchValue(adminData);
      // Remove password validation for edit mode
      this.adminForm.get('adminPassword')?.clearValidators();
      this.adminForm.get('adminPassword')?.updateValueAndValidity();
    }
  }

  ngOnInit() {
    // Focus on first name field instead of date field
    setTimeout(() => {
      const firstNameInput = document.getElementById('adminFirstName') as HTMLInputElement;
      if (firstNameInput) {
        firstNameInput.focus();
      }
      
      // Reset all form fields to untouched state to prevent validation errors on load
      this.adminForm.markAsUntouched();
      this.formInitialized = true;
    }, 100);
  }

  onClose() {
    this.ref.close();
  }


  onSubmit() {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = { ...this.adminForm.value };

    // Format date for API - fix timezone issue
    if (formData.adminDob) {
      const date = new Date(formData.adminDob);
      console.log('Original date:', formData.adminDob);
      console.log('Date object:', date);
      // Use local date to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formData.adminDob = `${year}-${month}-${day}`;
      console.log('Formatted date for API:', formData.adminDob);
    }

    console.log('Form data being sent:', formData);

    if (this.isEditMode) {
      // For edit mode, include adminId and companyId
      const adminData = {
        ...formData,
        adminId: this.config.data.admin.adminId,
        companyId: this.config.data.admin.companyId
      };
      
      this.companyAdminService.updateAdmin(adminData).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Admin updated successfully.' 
          });
          this.ref.close(adminData);
        },
        error: (error) => {
          console.error('Error updating admin:', error);
          const errorMessage = error.error?.message || error.message || 'Failed to update admin.';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.loading = false;
        }
      });
    } else {
      // For add mode, include companyId as 0 - backend will handle it from token
      const adminData = {
        ...formData,
        companyId: 0
      };
      
      this.companyAdminService.addAdmin(adminData).subscribe({
        next: () => {
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Admin added successfully.' 
          });
          this.ref.close(adminData);
        },
        error: (error) => {
          console.error('Error adding admin:', error);
          const errorMessage = error.error?.message || error.message || 'Failed to add admin.';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.loading = false;
        }
      });
    }
  }
}
