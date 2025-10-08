import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CompanyProfileService, CompanyProfile } from '../../shared/services/company-profile.service';
import { CompanySettingsService, CompanySettings } from '../../shared/services/company-settings.service';
import { HolidayService, CompanyHoliday } from '../../shared/services/holiday.service';

@Component({
  selector: 'app-employee-company-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TagModule,
    SelectModule,
    SkeletonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-company-details.html',
  styleUrl: './employee-company-details.css'
})
export class EmployeeCompanyDetailsComponent implements OnInit {
  companyProfile: CompanyProfile | null = null;
  companySettings: CompanySettings | null = null;
  error: string | null = null;
  
  // Loading states for skeleton
  isLoadingCompanyData: boolean = true;
  isLoadingHolidays: boolean = true;

  // Holiday-related properties
  holidays: CompanyHoliday[] = [];
  filteredHolidays: CompanyHoliday[] = [];
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = 0; // 0 for all months
  calendarYear: number = new Date().getFullYear();
  calendarMonth: number = new Date().getMonth();
  calendarDays: any[] = [];
  
  // Year and month options
  yearOptions: number[] = [];
  monthOptions = [
    { label: 'All Months', value: 0 },
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];
  
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private companyProfileService: CompanyProfileService,
    private companySettingsService: CompanySettingsService,
    private holidayService: HolidayService,
    private messageService: MessageService
  ) {
    // Generate year options (current year ± 5 years)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      this.yearOptions.push(i);
    }
  }

  ngOnInit() {
    this.loadCompanyData();
    this.loadHolidays();
  }

  loadCompanyData() {
    this.isLoadingCompanyData = true;
    this.error = null;

    // Get company ID from user data - try user_data first, then punchInUser
    let userData = localStorage.getItem('user_data');
    if (!userData) {
      userData = localStorage.getItem('punchInUser');
    }
    
    if (!userData) {
      this.error = 'User data not found';
      this.isLoadingCompanyData = false;
      return;
    }

    const user = JSON.parse(userData);
    const companyId = user.companyId;
    
    if (!companyId) {
      console.warn('No company ID found in user data');
      this.error = 'No company ID found in user data';
      this.isLoadingCompanyData = false;
      return;
    }

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
        this.isLoadingCompanyData = false;
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
        this.isLoadingCompanyData = false;
      }
    });
  }

  private checkDataLoaded() {
    if (this.companyProfile && this.companySettings) {
      this.isLoadingCompanyData = false;
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

  // Holiday-related methods
  loadHolidays() {
    this.isLoadingHolidays = true;
    const companyId = this.getCompanyId();
    if (!companyId) {
      this.isLoadingHolidays = false;
      return;
    }
    
    this.holidayService.getCompanyHolidays(companyId, this.selectedYear).subscribe({
      next: (holidays: CompanyHoliday[]) => {
        this.holidays = holidays.map((h: any) => ({
          ...h,
          holidayDate: new Date(h.holidayDate)
        }));
        this.filteredHolidays = [...this.holidays];
        this.generateCalendar();
        this.isLoadingHolidays = false;
      },
      error: (error: any) => {
        console.error('Error loading holidays:', error);
        this.isLoadingHolidays = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load holidays'
        });
      }
    });
  }

  getCompanyId(): number | null {
    // Try user_data first, then punchInUser
    let userData = localStorage.getItem('user_data');
    if (!userData) {
      userData = localStorage.getItem('punchInUser');
    }
    
    if (userData) {
      const user = JSON.parse(userData);
      return user.companyId || null;
    }
    return null;
  }

  onYearChange() {
    this.loadHolidays();
  }

  onMonthChange() {
    this.filterHolidaysByMonth();
  }

  filterHolidaysByMonth() {
    if (this.selectedMonth === 0) {
      this.filteredHolidays = [...this.holidays];
    } else {
      this.filteredHolidays = this.holidays.filter(h => 
        h.holidayDate.getMonth() + 1 === this.selectedMonth
      );
    }
  }

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
      const isHoliday = this.isHolidayDate(dayDate);
      
      this.calendarDays.push({
        date: new Date(dayDate),
        day: dayDate.getDate(),
        isCurrentMonth: isCurrentMonth,
        isToday: isToday,
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

  getDayClasses(day: any): string {
    let classes = '';
    
    if (!day.isCurrentMonth) {
      classes += 'text-gray-300 ';
    } else if (day.isToday) {
      classes += 'bg-blue-100 text-blue-900 font-semibold ';
    } else if (day.isHoliday) {
      classes += 'bg-red-50 text-red-700 hover:bg-red-100 ';
    } else {
      classes += 'text-gray-700 hover:bg-gray-100 ';
    }
    
    return classes.trim();
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDayTooltip(day: any): string {
    // Only show tooltips for holidays - just the holiday name
    if (day.isHoliday && day.holidayName) {
      return day.holidayName;
    }
    // Return empty string for non-holiday days (no tooltip)
    return '';
  }

  getTooltipPosition(index: number): string {
    // Calculate which section of the calendar this day is in
    // Calendar has 7 columns, so we can determine position based on index
    const row = Math.floor(index / 7);
    const col = index % 7;
    const totalRows = Math.ceil(this.calendarDays.length / 7);
    
    // More sophisticated positioning logic
    // Consider edge cases and provide better tooltip placement
    
    // Check if we're in the first or last row (edge cases)
    const isFirstRow = row === 0;
    const isLastRow = row === totalRows - 1;
    const isFirstCol = col === 0;
    const isLastCol = col === 6;
    
    // Determine optimal tooltip position based on calendar position
    if (isFirstRow) {
      // Top row - show tooltips below
      if (col < 2) return 'bottom-right';
      if (col < 5) return 'bottom-center';
      return 'bottom-left';
    } else if (isLastRow) {
      // Bottom row - show tooltips above
      if (col < 2) return 'top-right';
      if (col < 5) return 'top-center';
      return 'top-left';
    } else {
      // Middle rows - use quadrant logic
      if (row < totalRows / 2) {
        // Upper half
        if (col < 2) return 'bottom-right';
        if (col < 5) return 'bottom-center';
        return 'bottom-left';
      } else {
        // Lower half
        if (col < 2) return 'top-right';
        if (col < 5) return 'top-center';
        return 'top-left';
      }
    }
  }

  private hoverTimeout: any = null;
  private currentHoveredDay: any = null;

  onDayHover(day: any, index: number) {
    // Clear any existing timeout
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    
    // Set a small delay for better UX
    this.hoverTimeout = setTimeout(() => {
      this.currentHoveredDay = day;
      // Add any additional hover effects here if needed
    }, 100);
  }

  onDayLeave() {
    // Clear timeout on leave
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    this.currentHoveredDay = null;
  }


  getAriaLabel(day: any): string {
    if (day.isHoliday && day.holidayName) {
      const holiday = this.holidays.find(h => {
        const holidayDate = new Date(h.holidayDate);
        return holidayDate.getDate() === day.date.getDate() &&
               holidayDate.getMonth() === day.date.getMonth() &&
               holidayDate.getFullYear() === day.date.getFullYear();
      });
      
      if (holiday) {
        const status = holiday.isPaid ? 'Paid Holiday' : 'Unpaid Holiday';
        return `${day.day} - ${holiday.holidayName} - ${status}`;
      }
    }
    return `${day.day} - ${this.formatDate(day.date)}`;
  }
}
