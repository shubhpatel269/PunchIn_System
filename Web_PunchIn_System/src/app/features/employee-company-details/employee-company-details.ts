import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CompanyProfileService, CompanyProfile } from '../../shared/services/company-profile.service';
import { CompanySettingsService, CompanySettings } from '../../shared/services/company-settings.service';

@Component({
  selector: 'app-employee-company-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-company-details.html',
  styleUrl: './employee-company-details.css'
})
export class EmployeeCompanyDetailsComponent implements OnInit {
  companyProfile: CompanyProfile | null = null;
  companySettings: CompanySettings | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private companyProfileService: CompanyProfileService,
    private companySettingsService: CompanySettingsService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadCompanyData();
  }

  loadCompanyData() {
    this.loading = true;
    this.error = null;

    // Get company ID from user data
    const userData = localStorage.getItem('punchInUser');
    if (!userData) {
      this.error = 'User data not found';
      this.loading = false;
      return;
    }

    const user = JSON.parse(userData);
    const companyId = user.companyId || 1; // Default to company ID 1

    // Load company profile
    this.companyProfileService.getCompanyProfile(companyId).subscribe({
      next: (profile) => {
        this.companyProfile = profile;
        this.checkDataLoaded();
      },
      error: (err) => {
        console.error('Failed to load company profile:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load company profile information',
          life: 3000
        });
        this.loading = false;
      }
    });

    // Load company settings
    this.companySettingsService.getCompanySettings(companyId).subscribe({
      next: (settings) => {
        this.companySettings = settings;
        this.checkDataLoaded();
      },
      error: (err) => {
        console.error('Failed to load company settings:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load company settings information',
          life: 3000
        });
        this.loading = false;
      }
    });
  }

  private checkDataLoaded() {
    if (this.companyProfile && this.companySettings) {
      this.loading = false;
    }
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return '-';
    try {
      // Handle TimeSpan format (HH:MM:SS) from backend
      const timeParts = timeString.split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeString;
    }
  }

  getWorkingDaysDisplay(): string {
    // Default working days for most companies
    return 'Monday, Tuesday, Wednesday, Thursday, Friday';
  }

  getCompanyTypeColor(type: string): string {
    switch (type?.toLowerCase()) {
      case 'technology':
        return 'blue';
      case 'finance':
        return 'green';
      case 'healthcare':
        return 'red';
      case 'education':
        return 'orange';
      case 'retail':
        return 'purple';
      default:
        return 'gray';
    }
  }
}
