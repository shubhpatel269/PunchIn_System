import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { HolidayService } from '../../shared/services/holiday.service';
import { CompanyService } from '../../shared/services/company.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';

interface Holiday {
  holidayId: number;
  companyId: number;
  holidayDate: Date;
  holidayName: string;
  isPaid: boolean;
  isActive: boolean;
  createdDate: Date;
}

interface CompanySettings {
  companyId: number;
  workStartTime: string;
  workEndTime: string;
  graceLateMinutes: number;
  graceEarlyLeaveMinutes: number;
  allowHalfDay: boolean;
  halfDayHours: number;
  timeZone: string;
  isActive: boolean;
  createdDate: Date;
  updatedDate: Date;
}

@Component({
  selector: 'app-holiday-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    DatePickerModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    ConfirmDialogModule,
    MatDatepickerModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './holiday-management.html',
  styleUrl: './holiday-management.css',
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService]
})
export class HolidayManagementComponent implements OnInit, OnDestroy {
  // Calendar and date selection
  selectedDates: Date[] = [];
  selectedDate: Date | null = null;
  
  // Multiple date selection for Material Calendar
  daysSelected: string[] = [];
  currentYear: number = new Date().getFullYear();
  selectedYear: number = this.currentYear;
  selectedMonth: number = new Date().getMonth() + 1;
  
  // Holiday data
  holidays: Holiday[] = [];
  filteredHolidays: Holiday[] = [];
  loading: boolean = false;
  
  // UI state
  showAddDialog: boolean = false;
  showBulkDialog: boolean = false;
  showWeekendDialog: boolean = false;
  showCopyYearDialog: boolean = false;
  showSettingsDialog: boolean = false;
  
  // Selection mode
  selectionMode: 'single' | 'multiple' = 'single';
  selectedHolidays: Holiday[] = [];
  
  // Forms
  newHoliday: Partial<Holiday> = {
    holidayDate: new Date(),
    holidayName: '',
    isPaid: true
  };
  
  bulkHolidays: Partial<Holiday>[] = [];
  weekendSettings = {
    year: this.currentYear,
    includeSaturday: true,
    includeSunday: true,
    isPaid: false
  };
  
  copyYearSettings = {
    sourceYear: this.currentYear - 1,
    targetYear: this.currentYear
  };
  
  companySettings: CompanySettings | null = null;
  
  // Year options for dropdowns
  yearOptions: number[] = [];
  
  constructor(
    private holidayService: HolidayService,
    private companyService: CompanyService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Generate year options (current year ± 5 years)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      this.yearOptions.push(i);
    }
  }
  
  ngOnInit() {
    this.loadCompanySettings();
    this.loadHolidays();
  }
  
  ngOnDestroy() {
    // Cleanup if needed
  }
  
  // Load company settings
  loadCompanySettings() {
    const companyId = this.getCompanyId();
    if (companyId) {
      this.holidayService.getCompanySettings(companyId).subscribe({
        next: (settings: CompanySettings) => {
          this.companySettings = settings;
        },
        error: (error: any) => {
          console.error('Error loading company settings:', error);
        }
      });
    }
  }
  
  // Load holidays for selected year
  loadHolidays() {
    const companyId = this.getCompanyId();
    if (!companyId) return;
    
    this.loading = true;
    this.holidayService.getCompanyHolidays(companyId, this.selectedYear).subscribe({
      next: (holidays: Holiday[]) => {
        this.holidays = holidays.map((h: any) => ({
          ...h,
          holidayDate: new Date(h.holidayDate)
        }));
        this.filteredHolidays = [...this.holidays];
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading holidays:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load holidays'
        });
        this.loading = false;
      }
    });
  }
  
  // Get company ID from localStorage
  getCompanyId(): number | null {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      console.log('User from localStorage:', user);
      console.log('Company ID:', user.companyId);
      return user.companyId || null;
    }
    console.log('No user_data found in localStorage');
    return null;
  }
  
  // Year/Month change handlers
  onYearChange() {
    this.loadHolidays();
  }
  
  onMonthChange() {
    this.filterHolidaysByMonth();
  }
  
  // Filter holidays by month
  filterHolidaysByMonth() {
    if (this.selectedMonth === 0) {
      this.filteredHolidays = [...this.holidays];
    } else {
      this.filteredHolidays = this.holidays.filter(h => 
        h.holidayDate.getMonth() + 1 === this.selectedMonth
      );
    }
  }
  
  // Calendar date selection
  onDateSelect(event: any) {
    console.log('Date selected:', event);
    if (this.selectionMode === 'single') {
      this.selectedDate = event;
      this.selectedDates = [event];
    } else {
      this.selectedDates = event;
    }
  }
  
  // Toggle selection mode
  toggleSelectionMode() {
    this.selectionMode = this.selectionMode === 'single' ? 'multiple' : 'single';
    this.selectedDates = [];
    this.selectedDate = null;
  }
  
  // Add single holiday
  addHoliday() {
    console.log('addHoliday called');
    console.log('newHoliday:', this.newHoliday);
    
    if (!this.newHoliday.holidayDate || !this.newHoliday.holidayName) {
      console.log('Validation failed - missing required fields');
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields'
      });
      return;
    }
    
    const companyId = this.getCompanyId();
    console.log('Company ID:', companyId);
    if (!companyId) {
      console.log('No company ID found');
      return;
    }
    
    // Convert user's local timezone to UTC for database storage
    const selectedDate = new Date(this.newHoliday.holidayDate!);
    // Create UTC date by using the date components directly
    const utcDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));
    
    console.log('Date conversion debug:');
    console.log('Original date:', this.newHoliday.holidayDate);
    console.log('Selected date:', selectedDate);
    console.log('UTC date:', utcDate);
    console.log('UTC ISO string:', utcDate.toISOString());
    
    const holidayData = {
      companyId: companyId,
      holidayDate: utcDate,
      holidayName: this.newHoliday.holidayName!,
      isPaid: this.newHoliday.isPaid || true
    };
    
    console.log('Sending holiday data:', holidayData);
    
    this.holidayService.createHoliday(holidayData).subscribe({
      next: (response) => {
        console.log('Holiday created successfully:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Holiday added successfully'
        });
        this.showAddDialog = false;
        this.resetNewHoliday();
        this.loadHolidays();
      },
      error: (error: any) => {
        console.error('Error creating holiday:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to add holiday'
        });
      }
    });
  }
  
  // Add multiple holidays
  addMultipleHolidays() {
    if (this.selectedDates.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select dates'
      });
      return;
    }
    
    const companyId = this.getCompanyId();
    if (!companyId) return;
    
    const holidays = this.selectedDates.map(date => {
      // Convert user's local timezone to UTC for database storage
      const selectedDate = new Date(date);
      const utcDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()));
      
      return {
        holidayDate: utcDate,
        holidayName: `Holiday - ${utcDate.toLocaleDateString()}`,
        isPaid: true
      };
    });
    
    this.holidayService.createBulkHolidays(companyId, holidays).subscribe({
      next: (result: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${result.successCount} holidays added successfully`
        });
        if (result.errorCount > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: `${result.errorCount} holidays could not be added`
          });
        }
        this.showBulkDialog = false;
        this.selectedDates = [];
        this.loadHolidays();
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add holidays'
        });
      }
    });
  }
  
  // Add weekend holidays
  addWeekendHolidays() {
    const companyId = this.getCompanyId();
    if (!companyId) return;
    
    const weekendData = {
      companyId: companyId,
      year: this.weekendSettings.year,
      includeSaturday: this.weekendSettings.includeSaturday,
      includeSunday: this.weekendSettings.includeSunday,
      isPaid: this.weekendSettings.isPaid
    };
    
    console.log('Sending weekend data:', weekendData);
    
    this.holidayService.createWeekendHolidays(weekendData).subscribe({
      next: (result: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${result.successCount} weekend holidays added successfully`
        });
        this.showWeekendDialog = false;
        this.loadHolidays();
      },
      error: (error: any) => {
        console.error('Weekend holiday error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to add weekend holidays'
        });
      }
    });
  }
  
  // Copy holidays from previous year
  copyHolidaysFromYear() {
    const companyId = this.getCompanyId();
    if (!companyId) return;
    
    this.holidayService.copyHolidaysFromYear({
      companyId: companyId,
      sourceYear: this.copyYearSettings.sourceYear,
      targetYear: this.copyYearSettings.targetYear
    }).subscribe({
      next: (result: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${result.successCount} holidays copied successfully`
        });
        this.showCopyYearDialog = false;
        this.loadHolidays();
      },
      error: (error: any) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to copy holidays'
        });
      }
    });
  }
  
  // Delete holiday
  deleteHoliday(holiday: Holiday) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${holiday.holidayName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.holidayService.deleteHoliday(holiday.holidayId).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Holiday deleted successfully'
            });
            this.loadHolidays();
          },
          error: (error: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete holiday'
            });
          }
        });
      }
    });
  }
  
  // Delete multiple holidays
  deleteSelectedHolidays() {
    if (this.selectedHolidays.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select holidays to delete'
      });
      return;
    }
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.selectedHolidays.length} holidays?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const holidayIds = this.selectedHolidays.map(h => h.holidayId);
        const companyId = this.getCompanyId();
        if (!companyId) return;
        
        this.holidayService.deleteBulkHolidays(companyId, holidayIds).subscribe({
          next: (result: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${result.successCount} holidays deleted successfully`
            });
            this.selectedHolidays = [];
            this.loadHolidays();
          },
          error: (error: any) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete holidays'
            });
          }
        });
      }
    });
  }
  
  // Reset new holiday form
  resetNewHoliday() {
    this.newHoliday = {
      holidayDate: new Date(),
      holidayName: '',
      isPaid: true
    };
  }
  
  // Get holiday status tag
  getHolidayStatusTag(holiday: Holiday) {
    return {
      severity: holiday.isPaid ? 'success' : 'warning',
      value: holiday.isPaid ? 'Paid' : 'Unpaid'
    };
  }
  
  // Get company timezone from company settings
  getCompanyTimezone(): string {
    console.log('Company settings:', this.companySettings);
    console.log('Company timezone:', this.companySettings?.timeZone);
    // This should come from company settings, for now using default
    return this.companySettings?.timeZone || 'Asia/Kolkata';
  }

  // Format date for display - convert UTC to company timezone
  formatDate(date: Date | string): string {
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    // Convert UTC to company timezone
    const companyTimezone = this.getCompanyTimezone();
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: companyTimezone
    });
  }
  
  // Get selected date count
  getSelectedDateCount(): number {
    return this.selectedDates.length;
  }

  // Multiple date selection methods for Material Calendar
  isSelected: MatCalendarCellClassFunction<Date> = (cellDate: Date, view: string) => {
    if (view === 'month') {
      const date =
        cellDate.getFullYear() +
        "-" +
        ("00" + (cellDate.getMonth() + 1)).slice(-2) +
        "-" +
        ("00" + cellDate.getDate()).slice(-2);
      return this.daysSelected.find(x => x == date) ? "selected" : "";
    }
    return "";
  };

  selectDate(event: any, calendar: any) {
    console.log('Date selected:', event);
    const date =
      event.getFullYear() +
      "-" +
      ("00" + (event.getMonth() + 1)).slice(-2) +
      "-" +
      ("00" + event.getDate()).slice(-2);
    console.log('Formatted date:', date);
    
    const index = this.daysSelected.findIndex(x => x == date);
    if (index < 0) {
      this.daysSelected.push(date);
      console.log('Date added to selection:', date);
    } else {
      this.daysSelected.splice(index, 1);
      console.log('Date removed from selection:', date);
    }

    // Update selectedDates array for PrimeNG compatibility
    this.selectedDates = this.daysSelected.map(dateStr => new Date(dateStr));
    console.log('Selected dates:', this.selectedDates);
    
    calendar.updateTodaysDate();
    
    // Prevent the menu from closing automatically
    return false;
  }

  // Clear all selected dates
  clearSelectedDates() {
    this.daysSelected = [];
    this.selectedDates = [];
  }

  // Close calendar menu manually
  closeCalendarMenu(menu: any) {
    menu.close();
  }
  
  // Clear selections
  clearSelections() {
    this.selectedDates = [];
    this.selectedDate = null;
    this.selectedHolidays = [];
  }
}
