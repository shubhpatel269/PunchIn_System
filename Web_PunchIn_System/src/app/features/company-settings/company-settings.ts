import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { CompanySettingsService, CompanySettings, CreateCompanySettingsDto, UpdateCompanySettingsDto } from '../../shared/services/company-settings.service';
import { CompanyService } from '../../shared/services/company.service';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    ConfirmDialogModule,
    SkeletonModule
  ],
  templateUrl: './company-settings.html',
  styleUrl: './company-settings.css',
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService]
})
export class CompanySettingsComponent implements OnInit, OnDestroy {
  // Loading states
  loading: boolean = false;
  saving: boolean = false;
  
  // Company settings data
  companySettings: CompanySettings | null = null;
  companyId: number | null = null;
  
  // Form data
  settingsForm = {
    workStartTime: '09:00',
    workEndTime: '17:00',
    graceLateMinutes: 15,
    graceEarlyLeaveMinutes: 15,
    allowHalfDay: false,
    halfDayHours: 4,
    timeZone: 'UTC',
    breakTimeMinutes: 60
  };
  
  // Available options
  timeZones: string[] = [];
  timeZoneOptions: { label: string; value: string }[] = [];
  
  // Validation
  formErrors: { [key: string]: string } = {};
  
  constructor(
    private companySettingsService: CompanySettingsService,
    private companyService: CompanyService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.timeZones = this.companySettingsService.getAvailableTimeZones();
    this.timeZoneOptions = this.timeZones.map(tz => ({ label: tz, value: tz }));
  }
  
  ngOnInit() {
    this.loadCompanyId();
  }
  
  ngOnDestroy() {
    // Cleanup if needed
  }
  
  // Load company ID from localStorage or service
  loadCompanyId() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.companyId = user.companyId;
        if (this.companyId) {
          this.loadCompanySettings();
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load user data'
        });
      }
    } else {
      // Fallback: try to get from company service
      this.companyService.getCompany().subscribe({
        next: (company: any) => {
          if (company && company.companyId) {
            this.companyId = company.companyId;
            this.loadCompanySettings();
          } else if (Array.isArray(company) && company.length > 0) {
            this.companyId = company[0].companyId;
            this.loadCompanySettings();
          }
        },
        error: (error) => {
          console.error('Error loading company:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load company information'
          });
        }
      });
    }
  }
  
  // Load company settings
  loadCompanySettings() {
    if (!this.companyId) return;
    
    this.loading = true;
    this.companySettingsService.getCompanySettings(this.companyId).subscribe({
      next: (settings: CompanySettings) => {
        this.companySettings = settings;
        this.populateForm(settings);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading company settings:', error);
        
        // If settings don't exist (404), initialize with defaults
        if (error.status === 404) {
          this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'No company settings found. You can create new settings below.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to load company settings'
          });
        }
        this.loading = false;
      }
    });
  }
  
  // Populate form with settings data
  populateForm(settings: CompanySettings) {
    this.settingsForm = {
      workStartTime: this.companySettingsService.convertFromTimeSpan(settings.workStartTime),
      workEndTime: this.companySettingsService.convertFromTimeSpan(settings.workEndTime),
      graceLateMinutes: settings.graceLateMinutes,
      graceEarlyLeaveMinutes: settings.graceEarlyLeaveMinutes,
      allowHalfDay: settings.allowHalfDay,
      halfDayHours: settings.halfDayHours,
      timeZone: settings.timeZone,
      breakTimeMinutes: settings.breakTimeMinutes
    };
  }
  
  // Validate form
  validateForm(): boolean {
    this.formErrors = {};
    let isValid = true;
    
    // Validate work start time
    if (!this.settingsForm.workStartTime || !this.companySettingsService.validateTimeFormat(this.settingsForm.workStartTime)) {
      this.formErrors['workStartTime'] = 'Please enter a valid work start time (HH:MM format)';
      isValid = false;
    }
    
    // Validate work end time
    if (!this.settingsForm.workEndTime || !this.companySettingsService.validateTimeFormat(this.settingsForm.workEndTime)) {
      this.formErrors['workEndTime'] = 'Please enter a valid work end time (HH:MM format)';
      isValid = false;
    }
    
    // Validate work end time is after work start time
    if (this.settingsForm.workStartTime && this.settingsForm.workEndTime) {
      const startTime = new Date(`2000-01-01T${this.settingsForm.workStartTime}:00`);
      const endTime = new Date(`2000-01-01T${this.settingsForm.workEndTime}:00`);
      
      if (endTime <= startTime) {
        this.formErrors['workEndTime'] = 'Work end time must be after work start time';
        isValid = false;
      }
    }
    
    // Validate grace late minutes
    if (this.settingsForm.graceLateMinutes < 0 || this.settingsForm.graceLateMinutes > 120) {
      this.formErrors['graceLateMinutes'] = 'Grace late minutes must be between 0 and 120';
      isValid = false;
    }
    
    // Validate grace early leave minutes
    if (this.settingsForm.graceEarlyLeaveMinutes < 0 || this.settingsForm.graceEarlyLeaveMinutes > 120) {
      this.formErrors['graceEarlyLeaveMinutes'] = 'Grace early leave minutes must be between 0 and 120';
      isValid = false;
    }
    
    // Validate half day hours
    if (this.settingsForm.allowHalfDay) {
      if (this.settingsForm.halfDayHours < 1 || this.settingsForm.halfDayHours > 8) {
        this.formErrors['halfDayHours'] = 'Half day hours must be between 1 and 8';
        isValid = false;
      }
    }
    
    // Validate break time minutes
    if (this.settingsForm.breakTimeMinutes < 0 || this.settingsForm.breakTimeMinutes > 480) {
      this.formErrors['breakTimeMinutes'] = 'Break time minutes must be between 0 and 480 (8 hours)';
      isValid = false;
    }
    
    // Validate timezone
    if (!this.settingsForm.timeZone || this.settingsForm.timeZone.trim() === '') {
      this.formErrors['timeZone'] = 'Please select a timezone';
      isValid = false;
    }
    
    return isValid;
  }
  
  // Save company settings
  saveSettings() {
    if (!this.validateForm()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix the form errors before saving'
      });
      return;
    }
    
    if (!this.companyId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Company ID not found'
      });
      return;
    }
    
    this.saving = true;
    
    if (this.companySettings) {
      // Update existing settings
      this.updateSettings();
    } else {
      // Create new settings
      this.createSettings();
    }
  }
  
  // Create new company settings
  createSettings() {
    if (!this.companyId) return;
    
    const createDto: CreateCompanySettingsDto = {
      companyId: this.companyId,
      workStartTime: this.companySettingsService.convertToTimeSpan(this.settingsForm.workStartTime),
      workEndTime: this.companySettingsService.convertToTimeSpan(this.settingsForm.workEndTime),
      graceLateMinutes: this.settingsForm.graceLateMinutes,
      graceEarlyLeaveMinutes: this.settingsForm.graceEarlyLeaveMinutes,
      allowHalfDay: this.settingsForm.allowHalfDay,
      halfDayHours: this.settingsForm.halfDayHours,
      timeZone: this.settingsForm.timeZone,
      breakTimeMinutes: this.settingsForm.breakTimeMinutes
    };
    
    this.companySettingsService.createCompanySettings(createDto).subscribe({
      next: (settings: CompanySettings) => {
        this.companySettings = settings;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Company settings created successfully'
        });
        this.saving = false;
      },
      error: (error) => {
        console.error('Error creating company settings:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to create company settings'
        });
        this.saving = false;
      }
    });
  }
  
  // Update existing company settings
  updateSettings() {
    if (!this.companyId) return;
    
    const updateDto: UpdateCompanySettingsDto = {
      workStartTime: this.companySettingsService.convertToTimeSpan(this.settingsForm.workStartTime),
      workEndTime: this.companySettingsService.convertToTimeSpan(this.settingsForm.workEndTime),
      graceLateMinutes: this.settingsForm.graceLateMinutes,
      graceEarlyLeaveMinutes: this.settingsForm.graceEarlyLeaveMinutes,
      allowHalfDay: this.settingsForm.allowHalfDay,
      halfDayHours: this.settingsForm.halfDayHours,
      timeZone: this.settingsForm.timeZone,
      breakTimeMinutes: this.settingsForm.breakTimeMinutes
    };
    
    this.companySettingsService.updateCompanySettings(this.companyId, updateDto).subscribe({
      next: (settings: CompanySettings) => {
        this.companySettings = settings;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Company settings updated successfully'
        });
        this.saving = false;
      },
      error: (error) => {
        console.error('Error updating company settings:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to update company settings'
        });
        this.saving = false;
      }
    });
  }
  
  // Reset form to original values
  resetForm() {
    if (this.companySettings) {
      this.populateForm(this.companySettings);
      this.formErrors = {};
      this.messageService.add({
        severity: 'info',
        summary: 'Form Reset',
        detail: 'Form has been reset to original values'
      });
    } else {
      // Reset to defaults
      this.settingsForm = {
        workStartTime: '09:00',
        workEndTime: '17:00',
        graceLateMinutes: 15,
        graceEarlyLeaveMinutes: 15,
        allowHalfDay: false,
        halfDayHours: 4,
        timeZone: 'UTC',
        breakTimeMinutes: 60
      };
      this.formErrors = {};
      this.messageService.add({
        severity: 'info',
        summary: 'Form Reset',
        detail: 'Form has been reset to default values'
      });
    }
  }
  
  // Delete company settings
  deleteSettings() {
    if (!this.companyId) return;
    
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the company settings? This action cannot be undone.',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.companySettingsService.deleteCompanySettings(this.companyId!).subscribe({
          next: () => {
            this.companySettings = null;
            this.resetForm();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Company settings deleted successfully'
            });
          },
          error: (error) => {
            console.error('Error deleting company settings:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.message || 'Failed to delete company settings'
            });
          }
        });
      }
    });
  }
  
  // Get field error message
  getFieldError(fieldName: string): string {
    return this.formErrors[fieldName] || '';
  }
  
  // Check if field has error
  hasFieldError(fieldName: string): boolean {
    return !!this.formErrors[fieldName];
  }
}
