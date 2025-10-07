import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
    ConfirmDialogModule
  ],
  templateUrl: './holiday-management.html',
  styleUrl: './holiday-management.css',
  encapsulation: ViewEncapsulation.None,
  providers: [MessageService, ConfirmationService]
})
export class HolidayManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('holidaysContainer', { static: false }) holidaysContainer!: ElementRef;
  
  // Calendar and date selection
  selectedDate: Date | null = null;
  currentYear: number = new Date().getFullYear();
  selectedYear: number = this.currentYear;
  selectedMonth: number = new Date().getMonth() + 1;
  
  // Custom calendar properties
  calendarYear: number = this.currentYear;
  calendarMonth: number = new Date().getMonth();
  calendarDays: any[] = [];
  weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Holiday data
  holidays: Holiday[] = [];
  filteredHolidays: Holiday[] = [];
  loading: boolean = false;
  
  // UI state
  showAddDialog: boolean = false;
  showAllDayDialog: boolean = false;
  
  // Selection for bulk operations
  selectedHolidays: Holiday[] = [];
  
  // Holiday highlighting
  highlightedHoliday: Holiday | null = null;
  
  // Forms
  newHoliday: Partial<Holiday> = {
    holidayDate: new Date(),
    holidayName: '',
    isPaid: true
  };
  
  allDaySettings = {
    year: this.currentYear,
    includeSunday: false,
    includeMonday: false,
    includeTuesday: false,
    includeWednesday: false,
    includeThursday: false,
    includeFriday: false,
    includeSaturday: false,
    isPaid: false
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
    this.generateCalendar();
  }
  
  ngAfterViewInit() {
    // ViewChild references are available here
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
        this.generateCalendar(); // Regenerate calendar to show holidays
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
  
  // Add all-day holidays
  addAllDayHolidays() {
    const companyId = this.getCompanyId();
    if (!companyId) return;
    
    const allDayData = {
      companyId: companyId,
      year: this.allDaySettings.year,
      includeSunday: this.allDaySettings.includeSunday,
      includeMonday: this.allDaySettings.includeMonday,
      includeTuesday: this.allDaySettings.includeTuesday,
      includeWednesday: this.allDaySettings.includeWednesday,
      includeThursday: this.allDaySettings.includeThursday,
      includeFriday: this.allDaySettings.includeFriday,
      includeSaturday: this.allDaySettings.includeSaturday,
      isPaid: this.allDaySettings.isPaid
    };
    
    console.log('Sending all-day data:', allDayData);
    
     this.holidayService.createAllDayHolidays(allDayData).subscribe({
      next: (result: any) => {
         // Show appropriate message based on results
         if (result.successCount > 0 && result.errorCount === 0) {
           // All holidays added successfully
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${result.successCount} holidays added successfully`
        });
         } else if (result.successCount > 0 && result.errorCount > 0) {
           // Some holidays added, some already existed
           this.messageService.add({
             severity: 'info',
             summary: 'Partial Success',
             detail: `${result.successCount} holidays added, ${result.errorCount} already existed`
           });
         } else if (result.successCount === 0 && result.errorCount > 0) {
           // All holidays already existed
          this.messageService.add({
            severity: 'warn',
             summary: 'Info',
             detail: `All ${result.errorCount} holidays already exist for the selected days`
           });
         } else {
           // No holidays to add (shouldn't happen normally)
        this.messageService.add({
             severity: 'info',
             summary: 'Info',
             detail: 'No holidays were added'
           });
         }
         this.showAllDayDialog = false;
        this.loadHolidays();
      },
      error: (error: any) => {
        console.error('All-day holiday error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to add holidays'
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
  
   // Delete multiple holidays (optimized)
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
        const companyId = this.getCompanyId();
        if (!companyId) return;
         
         const holidayIds = this.selectedHolidays.map(h => h.holidayId);
        
        this.holidayService.deleteBulkHolidays(companyId, holidayIds).subscribe({
          next: (result: any) => {
             // Show appropriate message based on results
             if (result.successCount > 0 && result.errorCount === 0) {
               // All holidays deleted successfully
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${result.successCount} holidays deleted successfully`
            });
             } else if (result.successCount > 0 && result.errorCount > 0) {
               // Some holidays deleted, some not found
               this.messageService.add({
                 severity: 'warn',
                 summary: 'Partial Success',
                 detail: `${result.successCount} holidays deleted, ${result.errorCount} not found`
               });
             } else if (result.successCount === 0 && result.errorCount > 0) {
               // No holidays deleted
               this.messageService.add({
                 severity: 'error',
                 summary: 'Error',
                 detail: `No holidays could be deleted (${result.errorCount} not found)`
               });
             } else {
               // No holidays to delete
               this.messageService.add({
                 severity: 'info',
                 summary: 'Info',
                 detail: 'No holidays were deleted'
               });
             }
             
            this.selectedHolidays = [];
            this.loadHolidays();
          },
          error: (error: any) => {
             console.error('Bulk delete error:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
               detail: error.error?.message || 'Failed to delete holidays'
            });
             this.selectedHolidays = [];
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
  
  // Custom Calendar Methods
  generateCalendar() {
    this.calendarDays = [];
    const firstDay = new Date(this.calendarYear, this.calendarMonth, 1);
    const lastDay = new Date(this.calendarYear, this.calendarMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayDate = new Date(date);
      const isCurrentMonth = dayDate.getMonth() === this.calendarMonth;
      const isToday = this.isToday(dayDate);
      const isSelected = this.selectedDate && this.isSameDate(dayDate, this.selectedDate);
      const isHoliday = this.isHolidayDate(dayDate);
      
      this.calendarDays.push({
        date: new Date(dayDate),
        day: dayDate.getDate(),
        isCurrentMonth: isCurrentMonth,
        isToday: isToday,
        isSelected: isSelected,
        isHoliday: isHoliday,
        holidayName: isHoliday ? this.getHolidayName(dayDate) : null
      });
    }
  }
  
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  isSameDate(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  isHolidayDate(date: Date): boolean {
    return this.holidays.some(holiday => {
      const holidayDate = new Date(holiday.holidayDate);
      return holidayDate.getDate() === date.getDate() &&
             holidayDate.getMonth() === date.getMonth() &&
             holidayDate.getFullYear() === date.getFullYear();
    });
  }
  
  getHolidayName(date: Date): string | null {
    const holiday = this.holidays.find(h => {
      const holidayDate = new Date(h.holidayDate);
      return holidayDate.getDate() === date.getDate() &&
             holidayDate.getMonth() === date.getMonth() &&
             holidayDate.getFullYear() === date.getFullYear();
    });
    return holiday ? holiday.holidayName : null;
  }
  
  onCalendarDateClick(day: any) {
    if (day.isCurrentMonth) {
      this.selectedDate = day.date;
      this.newHoliday.holidayDate = day.date;
      
      // Find and highlight the corresponding holiday if it exists
      if (day.isHoliday && day.holidayName) {
        this.highlightedHoliday = this.holidays.find(h => {
          const holidayDate = new Date(h.holidayDate);
          return holidayDate.getDate() === day.date.getDate() &&
                 holidayDate.getMonth() === day.date.getMonth() &&
                 holidayDate.getFullYear() === day.date.getFullYear();
        }) || null;
        
        // Scroll to the highlighted holiday
        this.scrollToHighlightedHoliday();
    } else {
        this.highlightedHoliday = null;
      }
      
      this.generateCalendar(); // Regenerate to update selection
    }
  }
  
  previousMonth() {
    this.calendarMonth--;
    if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    }
    this.generateCalendar();
  }
  
  nextMonth() {
    this.calendarMonth++;
    if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    }
    this.generateCalendar();
  }
  
  goToToday() {
    const today = new Date();
    this.calendarYear = today.getFullYear();
    this.calendarMonth = today.getMonth();
    this.selectedDate = today;
    this.newHoliday.holidayDate = today;
    this.generateCalendar();
  }
  
  clearSelection() {
    this.selectedDate = null;
    this.newHoliday.holidayDate = new Date();
    this.highlightedHoliday = null;
    this.generateCalendar();
  }
  
  getDayClasses(day: any): string {
    let classes = '';
    
    if (!day.isCurrentMonth) {
      classes += 'text-gray-300 ';
    } else if (day.isToday) {
      classes += 'bg-blue-100 text-blue-900 font-semibold ';
    } else if (day.isSelected) {
      classes += 'bg-blue-600 text-white font-semibold ';
    } else if (day.isHoliday) {
      classes += 'bg-red-50 text-red-700 hover:bg-red-100 ';
    } else {
      classes += 'text-gray-700 hover:bg-gray-100 ';
    }
    
    return classes.trim();
  }
  
  isHolidayHighlighted(holiday: Holiday): boolean {
    return this.highlightedHoliday?.holidayId === holiday.holidayId;
  }
  
  scrollToHighlightedHoliday() {
    if (this.highlightedHoliday && this.holidaysContainer) {
      setTimeout(() => {
        const highlightedElement = this.holidaysContainer.nativeElement.querySelector('.holiday-highlighted');
        if (highlightedElement) {
          highlightedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  }
  
}
