import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AttendanceService, AttendanceRecordDTO, SessionRecord } from '../../shared/services/attendance.service';
import { EmployeeService, CombinedAttendanceResponse, DailyAttendanceSummary } from '../../shared/services/employee.service';
import { LocationLogService } from '../../shared/services/location-log.service';
import * as L from 'leaflet';

interface AttendanceRecord {
  date: string;
  day: string;
  punchIn: string | null;
  punchOut: string | null;
  punchInDateTime: string | null; // Original datetime for positioning
  punchOutDateTime: string | null; // Original datetime for positioning
  totalHours: number;
  totalHoursFormatted: string;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday';
  overtime: number;
  breakCount: number;
  totalBreak: number;
  totalBreakFormatted: string;
  sessionId?: number;
  punchId?: number;
  sessionStatus?: string;
  isFirstSession?: boolean;
  isLastSession?: boolean;
}

interface MonthlyStats {
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  holidays: number;
  totalHours: number;
  averageHours: number;
  overtimeHours: number;
  attendancePercentage: number;
}

interface LocationData {
  logId: number;
  sessionId: number;
  employeeId: string;
  logTimestamp: string;
  locationLat: number;
  locationLong: number;
}

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ChartModule,
    DatePickerModule,
    SelectModule,
    DividerModule,
    ProgressBarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-attendance.html',
  styleUrl: './employee-attendance.css'
})
export class EmployeeAttendanceComponent implements OnInit {
  user: any = null;
  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();
  isAdminView: boolean = false;
  viewingEmployeeId: string | null = null;
  monthlyStats: MonthlyStats = {
    totalDays: 0,
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    holidays: 0,
    totalHours: 0,
    averageHours: 0,
    overtimeHours: 0,
    attendancePercentage: 0
  };

  // Chart data
  attendanceChartData: any;
  hoursChartData: any;
  chartOptions: any;

  // Calendar view data
  timeSlots: any[] = [];
  calendarDays: any[] = [];
  weeklyCalendarDays: any[] = [];
  selectedDay: any = null;
  tooltipVisible: boolean = false;
  tooltipX: number = 0;
  tooltipY: number = 0;
  calendarView: 'week' | 'month' = 'week';
  timePeriodView: 'am' | 'pm' = 'am';
  currentWeekStart: Date = new Date();
  hoveredSession: any = null;
  sessionTooltipX: number = 0;
  sessionTooltipY: number = 0;
  tooltipPosition: string = 'bottom-right';

  // Table data
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  
  // Location tracking modal properties
  showLocationModal: boolean = false;
  selectedSessionId: number | null = null;
  locationData: LocationData[] = [];
  loadingLocationData: boolean = false;
  private map: L.Map | null = null;
  
  // Combined data for daily summary
  combinedAttendanceData: CombinedAttendanceResponse | null = null;
  dailySummaryRecords: AttendanceRecord[] = [];
  
  // Detailed sessions data
  detailedSessionsData: AttendanceRecord[] = [];
  filteredDetailedRecords: AttendanceRecord[] = [];

  // Month/Year options
  months = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 }
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private locationLogService: LocationLogService
  ) {}

  ngOnInit() {
    // Check if this is an admin viewing a specific employee
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isAdminView = true;
        this.viewingEmployeeId = params['id'];
        this.loadEmployeeData(params['id']);
        // Load attendance data after employee data is set
        this.loadAttendanceData();
      } else {
        this.loadUserData();
        // Load attendance data after user data is set
        this.loadAttendanceData();
      }
    });
    
    this.initializeCharts();
  }

  loadUserData() {
    const userData = localStorage.getItem('punchInUser');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadEmployeeData(employeeId: string) {
    // For admin view, we need to fetch employee data by ID
    // For now, we'll create a mock user object with the employee ID
    // You can implement actual API call to fetch employee details here
    this.user = {
      employeeId: employeeId,
      name: 'Employee', // This should be fetched from API
      email: '', // This should be fetched from API
    };
  }

  loadAttendanceData() {
    if (!this.user?.employeeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee ID not found',
        life: 3000
      });
      return;
    }

    // Load both combined data (for daily summary) and detailed sessions
    const year = this.selectedYear;
    const month = this.selectedMonth + 1; // Convert to 1-12 format

    // 1. Load combined data for daily summary
    const combinedApiCall = this.isAdminView 
      ? this.employeeService.getCombinedAttendanceForEmployee(this.user.employeeId, year, month)
      : this.employeeService.getSelfCombinedAttendance(year, month);

    combinedApiCall.subscribe({
      next: (response) => {
        // Store combined data for daily summary
        this.combinedAttendanceData = response;
        this.dailySummaryRecords = this.transformCombinedDataToRecords(response);
        this.calculateMonthlyStatsFromCombined(response);
        this.initializeCharts();
        // Initialize calendar after data is loaded
        this.initializeCalendar();
      },
      error: (error) => {
        console.error('Error loading combined attendance data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load attendance summary data',
          life: 3000
        });
      }
    });

    // 2. Load detailed sessions data (for calendar view - all users, but table only for admins)
    const startDate = new Date(this.selectedYear, this.selectedMonth, 1);
    // Ensure we include today's date if viewing current month
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === this.selectedYear && today.getMonth() === this.selectedMonth;
    
    let endDate: Date;
    if (isCurrentMonth) {
      // For current month, include today's date with time set to end of day
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else {
      // For past months, use the last day of the month
      endDate = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59, 999);
    }

    this.attendanceService.getAttendanceSummary(this.user.employeeId, startDate, endDate)
      .subscribe({
        next: (response) => {
          
          // Transform the detailed attendance data for calendar view (all users)
          this.detailedSessionsData = this.transformApiDataToRecords(response.records);
          
          // Only create filtered records for admin view (detailed sessions table)
          if (this.isAdminView) {
            this.filteredDetailedRecords = [...this.detailedSessionsData];
          }
          
          // Refresh weekly view with new data
          if (this.calendarView === 'week') {
            this.generateWeeklyCalendarDays();
          }
        },
        error: (error) => {
          console.error('Error loading detailed sessions data:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load detailed sessions data',
            life: 3000
          });
          // Fallback to empty data
          this.detailedSessionsData = [];
          if (this.isAdminView) {
            this.filteredDetailedRecords = [];
          }
        }
      });
  }

  transformApiDataToRecords(apiRecords: AttendanceRecordDTO[]): AttendanceRecord[] {
    const allRecords: AttendanceRecord[] = [];
    
    apiRecords.forEach(record => {
      const sessions = record.sessions || [];
      
      if (sessions.length === 0) {
        // No sessions for this day - add absent record
        allRecords.push({
          date: record.date,
          day: record.day,
          punchIn: null,
          punchOut: null,
          punchInDateTime: null,
          punchOutDateTime: null,
          totalHours: 0,
          totalHoursFormatted: '0h',
          status: 'absent',
          overtime: 0,
          breakCount: 0,
          totalBreak: 0,
          totalBreakFormatted: '-'
        });
        return;
      }
      
      // Create a record for each session
      sessions.forEach((session, index) => {
        const isFirstSession = index === 0;
        const isLastSession = index === sessions.length - 1;
        
        const sessionHours = session.sessionDuration ? this.parseTimeSpan(session.sessionDuration) : 0;
        const sessionBreakHours = session.totalBreakDuration ? this.parseTimeSpan(session.totalBreakDuration) : 0;
        
        
        // Determine status based on session
        let status: AttendanceRecord['status'] = 'present';
        if (sessionHours > 0 && sessionHours < 6) {
          status = 'half-day';
        }
        
        
        const transformedRecord = {
          date: this.formatDateForDisplay(record.date),
          day: record.day,
          punchIn: this.formatTime(session.sessionStartTime),
          punchOut: session.sessionEndTime ? this.formatTime(session.sessionEndTime) : null,
          // Store original datetime for positioning calculations
          punchInDateTime: session.sessionStartTime,
          punchOutDateTime: session.sessionEndTime,
          totalHours: Math.round(sessionHours * 100) / 100,
          totalHoursFormatted: this.formatWorkTime(sessionHours),
          status,
          overtime: sessionHours > 8 ? Math.round((sessionHours - 8) * 100) / 100 : 0,
          breakCount: session.breakCount || 0,
          totalBreak: Math.round(sessionBreakHours * 100) / 100,
          totalBreakFormatted: this.formatTimeSpan(session.totalBreakDuration || '00:00:00'),
          sessionId: session.sessionId,
          punchId: session.punchId,
          sessionStatus: session.sessionStatus,
          isFirstSession,
          isLastSession
        };
        
        allRecords.push(transformedRecord);
      });
    });
    
    return allRecords;
  }

  transformCombinedDataToRecords(combinedData: CombinedAttendanceResponse): AttendanceRecord[] {
    const allRecords: AttendanceRecord[] = [];
    
    // Transform daily records from the combined API
    combinedData.dailyRecords.forEach(dailyRecord => {
      allRecords.push({
        date: this.formatDateForDisplay(dailyRecord.date),
        day: dailyRecord.day,
        punchIn: dailyRecord.firstPunchIn ? this.formatTime(dailyRecord.firstPunchIn) : null,
        punchOut: dailyRecord.lastPunchOut ? this.formatTime(dailyRecord.lastPunchOut) : null,
        punchInDateTime: dailyRecord.firstPunchIn,
        punchOutDateTime: dailyRecord.lastPunchOut,
        totalHours: this.parseTimeSpan(dailyRecord.totalWorkHours),
        totalHoursFormatted: this.formatTimeSpan(dailyRecord.totalWorkHours),
        status: dailyRecord.status as 'present' | 'absent' | 'late' | 'half-day' | 'holiday',
        overtime: this.parseTimeSpan(dailyRecord.overtimeHours),
        breakCount: dailyRecord.breakCount,
        totalBreak: this.parseTimeSpan(dailyRecord.totalBreakTime),
        totalBreakFormatted: this.formatTimeSpan(dailyRecord.totalBreakTime),
        sessionId: dailyRecord.sessionCount // Using session count as identifier
      });
    });
    
    return allRecords;
  }

  calculateMonthlyStatsFromCombined(combinedData: CombinedAttendanceResponse) {
    
    // Use the summary data directly from the combined API
    this.monthlyStats = {
      totalDays: combinedData.totalDays,
      workingDays: combinedData.workingDays,
      presentDays: combinedData.presentDays,
      absentDays: combinedData.absentDays,
      lateDays: combinedData.lateDays,
      halfDays: combinedData.halfDays,
      holidays: combinedData.holidayDays,
      totalHours: this.parseTimeSpan(combinedData.totalWorkHours),
      averageHours: combinedData.averageDailyHours,
      overtimeHours: this.parseTimeSpan(combinedData.totalOvertimeHours),
      attendancePercentage: combinedData.attendanceRate
    };
    
  }

  private parseTimeSpan(timeSpanString: string): number {
    // Parse TimeSpan string like "08:30:00" to hours
    const parts = timeSpanString.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return hours + (minutes / 60);
    }
    return 0;
  }


  private formatBreakTime(hours: number): string {
    if (hours === 0) {
      return '0s';
    }
    
    // Convert hours to total seconds for more precise calculation
    const totalSeconds = Math.round(hours * 3600);
    
    if (totalSeconds < 60) {
      // Less than 1 minute, show in seconds
      return `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      // Less than 1 hour, show in minutes and seconds
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if (seconds === 0) {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    } else {
      // 1 hour or more, show in hours, minutes, and seconds
      const wholeHours = Math.floor(totalSeconds / 3600);
      const remainingSeconds = totalSeconds % 3600;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      
      let result = `${wholeHours}h`;
      
      if (minutes > 0) {
        result += ` ${minutes}m`;
      }
      
      if (seconds > 0) {
        result += ` ${seconds}s`;
      }
      
      return result;
    }
  }

  public formatWorkTime(hours: number): string {
    if (hours === 0) {
      return '0s';
    }
    
    // Handle negative values
    const isNegative = hours < 0;
    const absHours = Math.abs(hours);
    
    // Convert to total seconds for more precise calculation
    const totalSeconds = Math.round(absHours * 3600);
    
    let result = '';
    
    if (totalSeconds < 60) {
      // Less than 1 minute, show in seconds
      result = `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      // Less than 1 hour, show in minutes and seconds
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if (seconds === 0) {
        result = `${minutes}m`;
      } else {
        result = `${minutes}m ${seconds}s`;
      }
    } else {
      // 1 hour or more, show in hours, minutes, and seconds
      const wholeHours = Math.floor(totalSeconds / 3600);
      const remainingSeconds = totalSeconds % 3600;
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      
      result = `${wholeHours}h`;
      
      if (minutes > 0) {
        result += ` ${minutes}m`;
      }
      
      if (seconds > 0) {
        result += ` ${seconds}s`;
      }
    }
    
    // Add negative sign if needed
    return isNegative ? `-${result}` : result;
  }

  private formatHours(hours: number): string {
    if (hours === 0) {
      return '0s';
    }
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  }

  public formatTime(timeString: string | null): string {
    if (!timeString) {
      return '-';
    }
    
    try {
      // Handle UTC timestamps properly by adding 'Z' if not present
      const date = new Date(timeString.endsWith('Z') ? timeString : timeString + 'Z');
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Format in user's local timezone (automatically handled by toLocaleTimeString)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '-';
    }
  }

  private formatTimeSpan(timeSpanString: string): string {
    if (!timeSpanString) {
      return '0h 0m';
    }
    
    try {
      // Parse TimeSpan string (e.g., "06:30:00" or "1.05:30:00")
      const parts = timeSpanString.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
          return '0s';
        }
        
        if (hours === 0) {
          if (minutes === 0) {
            // Only seconds
            return `${seconds}s`;
          } else if (seconds === 0) {
            // Only minutes
            return `${minutes}m`;
          } else {
            // Minutes and seconds
            return `${minutes}m ${seconds}s`;
          }
        } else if (minutes === 0 && seconds === 0) {
          // Only hours
          return `${hours}h`;
        } else if (seconds === 0) {
          // Hours and minutes
          return `${hours}h ${minutes}m`;
        } else {
          // Hours, minutes, and seconds
          return `${hours}h ${minutes}m ${seconds}s`;
        }
      }
      
      // Fallback for other formats
      return timeSpanString;
    } catch (error) {
      console.error('Error formatting TimeSpan:', error);
      return timeSpanString || '0s';
    }
  }

  calculateMonthlyStats() {
    // Group records by date to calculate daily statistics
    const dailyRecords = new Map<string, AttendanceRecord[]>();
    
    this.attendanceRecords.forEach(record => {
      if (!dailyRecords.has(record.date)) {
        dailyRecords.set(record.date, []);
      }
      dailyRecords.get(record.date)!.push(record);
    });

    const uniqueDays = dailyRecords.size;
    const workingDays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.some(r => r.status !== 'holiday' && r.status !== 'absent')
    ).length;
    
    const presentDays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.some(r => r.status === 'present' || r.status === 'late')
    ).length;
    
    const absentDays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.every(r => r.status === 'absent')
    ).length;
    
    const lateDays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.some(r => r.status === 'late')
    ).length;
    
    const halfDays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.some(r => r.status === 'half-day')
    ).length;
    
    const holidays = Array.from(dailyRecords.values()).filter(dayRecords => 
      dayRecords.every(r => r.status === 'holiday')
    ).length;
    
    const totalHours = this.attendanceRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = this.attendanceRecords.reduce((sum, r) => sum + r.overtime, 0);

    this.monthlyStats = {
      totalDays: uniqueDays,
      workingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      holidays,
      totalHours,
      averageHours: workingDays > 0 ? totalHours / workingDays : 0,
      overtimeHours,
      attendancePercentage: workingDays > 0 ? (presentDays / workingDays) * 100 : 0
    };
  }

  initializeCharts() {
    // Attendance distribution chart
    this.attendanceChartData = {
      labels: ['Present', 'Absent', 'Late', 'Half Day', 'Holidays'],
      datasets: [{
        data: [
          this.monthlyStats.presentDays,
          this.monthlyStats.absentDays,
          this.monthlyStats.lateDays,
          this.monthlyStats.halfDays,
          this.monthlyStats.holidays
        ],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#6B7280'],
        borderWidth: 0
      }]
    };

    // Weekly hours trend chart
    const weeklyData = this.getWeeklyHoursData();
    const weekLabels = this.getWeekLabels();
    
    this.hoursChartData = {
      labels: weekLabels,
      datasets: [{
        label: 'Hours Worked',
        data: weeklyData,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              return `Hours: ${this.formatWorkTime(hours)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 50,
          ticks: {
            callback: (value: any) => {
              return `${value}h`;
            }
          }
        }
      }
    };

    // Initialize calendar view
    this.initializeCalendar();
  }

  getWeeklyHoursData(): number[] {
    const weeks = [0, 0, 0, 0, 0];
    
    // Use dailySummaryRecords from the combined API
    this.dailySummaryRecords.forEach(record => {
      const day = new Date(record.date).getDate();
      const weekIndex = Math.floor((day - 1) / 7);
      if (weekIndex < 5) {
        weeks[weekIndex] += record.totalHours;
      }
    });
    
    return weeks;
  }

  getWeekLabels(): string[] {
    const labels = [];
    const monthStart = new Date(this.selectedYear, this.selectedMonth, 1);
    
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(monthStart);
      weekStart.setDate(monthStart.getDate() + (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Only show weeks that are within the current month
      if (weekStart.getMonth() === this.selectedMonth) {
        const startDay = weekStart.getDate();
        const endDay = Math.min(weekEnd.getDate(), new Date(this.selectedYear, this.selectedMonth + 1, 0).getDate());
        labels.push(`${startDay}-${endDay}`);
      } else {
        labels.push('');
      }
    }
    
    return labels.filter(label => label !== '');
  }

  onMonthChange() {
    this.loadAttendanceData();
    this.initializeCharts();
    // Calendar will be initialized after data loads in loadAttendanceData
  }

  onYearChange() {
    this.loadAttendanceData();
    this.initializeCharts();
    // Calendar will be initialized after data loads in loadAttendanceData
  }

  exportAttendance() {
    this.messageService.add({
      severity: 'info',
      summary: 'Export Started',
      detail: 'Your attendance report is being prepared for download.',
      life: 3000
    });
  }

  goBack() {
    if (this.isAdminView) {
      this.router.navigate(['/admin/manage-employee']);
    } else {
      this.router.navigate(['/employee/dashboard']);
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'half-day': return 'info';
      case 'holiday': return 'secondary';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'present': return 'pi pi-check-circle';
      case 'absent': return 'pi pi-times-circle';
      case 'late': return 'pi pi-clock';
      case 'half-day': return 'pi pi-minus-circle';
      case 'holiday': return 'pi pi-calendar';
      default: return 'pi pi-question-circle';
    }
  }

  formatDate(dateString: string): string {
    try {
      // Handle UTC timestamps properly by adding 'Z' if not present
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Format in user's local timezone (automatically handled by toLocaleDateString)
      return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  }

  public formatDateForDisplay(dateInput: string | Date): string {
    try {
      let date: Date;
      
      if (dateInput instanceof Date) {
        // If it's already a Date object, use it directly
        date = dateInput;
      } else {
        // If it's a string, handle UTC timestamps properly by adding 'Z' if not present
        date = new Date(dateInput.endsWith('Z') ? dateInput : dateInput + 'Z');
      }
      
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      // Return the date in ISO format for consistent display
      // The date will be automatically converted to local timezone by the browser
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return '-';
    }
  }

  // Calendar view methods
  initializeCalendar() {
    this.generateTimeSlots();
    this.generateCalendarDays();
    this.initializeWeeklyView();
    
    // Set weekly view as default and ensure it's properly initialized
    this.setCalendarView('week');
  }

  generateTimeSlots() {
    this.timeSlots = [];
    
    if (this.timePeriodView === 'am') {
      // AM section (12 AM to 11 AM - 0 to 11)
      for (let hour = 0; hour <= 11; hour++) {
        let timeString: string;
        if (hour === 0) {
          timeString = '12:00 AM';
        } else {
          timeString = `${hour}:00 AM`;
        }
        this.timeSlots.push({
          time: timeString,
          period: 'AM',
          hour: hour,
          minute: 0
        });
      }
    } else {
      // PM section (12 PM to 11 PM + 12 AM - 12 to 23, then 0)
      for (let hour = 12; hour <= 23; hour++) {
        let timeString: string;
        if (hour === 12) {
          timeString = '12:00 PM';
        } else {
          timeString = `${hour - 12}:00 PM`;
        }
        this.timeSlots.push({
          time: timeString,
          period: 'PM',
          hour: hour,
          minute: 0
        });
      }
      // Add midnight (24:00 = 0:00)
      this.timeSlots.push({
        time: '12:00 AM',
        period: 'PM',
        hour: 0,
        minute: 0
      });
    }
    
  }

  generateCalendarDays() {
    this.calendarDays = [];
    const monthStart = new Date(this.selectedYear, this.selectedMonth, 1);
    const monthEnd = new Date(this.selectedYear, this.selectedMonth + 1, 0);
    
    
    // Generate days for the current month
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const date = new Date(this.selectedYear, this.selectedMonth, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Get sessions for this day from detailed sessions data
      const daySessions = this.detailedSessionsData.filter(record => {
        // Handle both string and Date formats
        let recordDate: Date;
        if (typeof record.date === 'string') {
          // If it's a string, parse it directly
          recordDate = new Date(record.date);
        } else {
          recordDate = record.date;
        }
        
        // Compare dates properly
        return recordDate.getDate() === day && 
               recordDate.getMonth() === this.selectedMonth && 
               recordDate.getFullYear() === this.selectedYear;
      });



      this.calendarDays.push({
        date: date,
        dayNumber: day,
        dayName: dayName,
        sessions: daySessions
      });
    }
  }

  getSessionClass(session: any): string {
    switch (session.status) {
      case 'present':
        return 'attendance-block on-time';
      case 'late':
        return 'attendance-block late';
      case 'half-day':
        return 'attendance-block half-day';
      case 'absent':
        return 'attendance-block absent';
      default:
        return 'attendance-block on-time';
    }
  }

  getSessionStatus(session: any): string {
    switch (session.status) {
      case 'present':
        return 'On time';
      case 'late':
        return 'Late';
      case 'half-day':
        return 'Half day';
      case 'absent':
        return 'Absent';
      default:
        return 'On time';
    }
  }

  getSessionTopPosition(session: any, sessions: any[], sessionIndex: number): number {
    if (!session.punchInDateTime) return 5; // Default position for sessions without start time
    
    try {
      // Parse the formatted time string instead of raw datetime to get correct local time
      const formattedTime = this.formatTime(session.punchInDateTime);
      const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      
      if (!timeMatch) {
        console.error('Could not parse formatted time:', formattedTime);
        return 5;
      }
      
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'AM' && hour === 12) {
        hour = 0;
      } else if (period === 'PM' && hour !== 12) {
        hour += 12;
      }
      
      // Calculate position based on current time period view
      let totalMinutes: number;
      let totalTimeSpan: number;
      
      if (this.timePeriodView === 'am') {
        // AM view: 12 AM to 11 AM (0 to 11 - 12 hours = 720 minutes)
        const startHour = 0;
        totalMinutes = (hour - startHour) * 60 + minute;
        totalTimeSpan = 720; // 12 hours (0-11 AM)
      } else {
        // PM view: 12 PM to 11 PM + 12 AM (12 to 23, then 0 - 12 hours = 720 minutes)
        let adjustedHour = hour;
        if (hour === 0) adjustedHour = 24; // Handle midnight as 24:00 for PM view
        const startHour = 12;
        totalMinutes = (adjustedHour - startHour) * 60 + minute;
        totalTimeSpan = 720; // 12 hours (12 PM - 11 PM + 12 AM)
      }
      
      const basePercentage = (totalMinutes / totalTimeSpan) * 100;
      
        // For multiple sessions at the same time, add vertical stacking
        if (sessions.length > 1) {
          const sameTimeSessions = sessions.filter(s => {
            if (!s.punchInDateTime) return false;
            const sFormattedTime = this.formatTime(s.punchInDateTime);
            const sTimeMatch = sFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!sTimeMatch) return false;
            
            let sHour = parseInt(sTimeMatch[1]);
            const sMinute = parseInt(sTimeMatch[2]);
            const sPeriod = sTimeMatch[3].toUpperCase();
            
            // Convert to 24-hour format
            if (sPeriod === 'AM' && sHour === 12) {
              sHour = 0;
            } else if (sPeriod === 'PM' && sHour !== 12) {
              sHour += 12;
            }
            
            // Check if within 5 minutes
            const timeDiff = Math.abs((sHour * 60 + sMinute) - (hour * 60 + minute));
            return timeDiff < 5; // Within 5 minutes
          });
        
        if (sameTimeSessions.length > 1) {
          const sortedSameTimeSessions = sameTimeSessions.sort((a, b) => {
            const aIndex = sessions.findIndex(s => s === a);
            const bIndex = sessions.findIndex(s => s === b);
            return aIndex - bIndex;
          });
          
          const sameTimeIndex = sortedSameTimeSessions.findIndex(s => s === session);
          // Use smaller offset for cleaner stacking - just 1% per session
          const stackOffset = sameTimeIndex * 1; // 1% offset per stacked session
          return Math.max(2, Math.min(95, basePercentage + stackOffset));
        }
      }
      
      
      return Math.max(2, Math.min(95, basePercentage));
    } catch (error) {
      console.error('Error calculating session position:', error);
      return 5; // Default position for error cases
    }
  }

  getSessionHeight(session: any, sessions: any[]): number {
    if (!session.punchInDateTime) return 8; // Minimum height for sessions without start time
    
    try {
      // Use the same timezone-aware parsing as positioning
      const formattedTime = this.formatTime(session.punchInDateTime);
      const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      
      if (!timeMatch) {
        console.error('Could not parse formatted time for height calculation:', formattedTime);
        return 8;
      }
      
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'AM' && hour === 12) {
        hour = 0;
      } else if (period === 'PM' && hour !== 12) {
        hour += 12;
      }
      
      // Create a proper local date for today with the parsed time
      const today = new Date();
      const punchInTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
      
      let durationMinutes: number;
      
      if (!session.punchOutDateTime) {
        // For active sessions, calculate from start time to now
        const now = new Date();
        const durationMs = now.getTime() - punchInTime.getTime();
        durationMinutes = durationMs / (1000 * 60);
        
      } else {
        // For completed sessions, calculate from start to end time
        const punchOutFormattedTime = this.formatTime(session.punchOutDateTime);
        const punchOutTimeMatch = punchOutFormattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (!punchOutTimeMatch) {
          console.error('Could not parse punch out time:', punchOutFormattedTime);
          return 8;
        }
        
        let punchOutHour = parseInt(punchOutTimeMatch[1]);
        const punchOutMinute = parseInt(punchOutTimeMatch[2]);
        const punchOutPeriod = punchOutTimeMatch[3].toUpperCase();
        
        // Convert to 24-hour format
        if (punchOutPeriod === 'AM' && punchOutHour === 12) {
          punchOutHour = 0;
        } else if (punchOutPeriod === 'PM' && punchOutHour !== 12) {
          punchOutHour += 12;
        }
        
        const punchOutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), punchOutHour, punchOutMinute, 0, 0);
        const durationMs = punchOutTime.getTime() - punchInTime.getTime();
        durationMinutes = durationMs / (1000 * 60);
      }
      
      // Convert to percentage based on current time period view
      let totalTimeSpan: number;
      if (this.timePeriodView === 'am') {
        totalTimeSpan = 720; // 12 hours for AM view (0-12)
      } else {
        totalTimeSpan = 720; // 12 hours for PM view (12-24)
      }
      
      // For very short sessions (0-60 seconds), show as thin line (2-3px)
      if (durationMinutes <= 1) { // 1 minute or less
        return 0.3; // Very small percentage for thin line
      }
      
      const percentage = (durationMinutes / totalTimeSpan) * 100;
      
      
      // For multiple sessions, ensure they don't overlap by limiting height
      if (sessions.length > 1) {
        // Calculate how many sessions are at the same time
        const sameTimeSessions = sessions.filter(s => {
          if (!s.punchInDateTime) return false;
          const sTime = new Date(s.punchInDateTime);
          const timeDiff = Math.abs(sTime.getTime() - punchInTime.getTime());
          return timeDiff < 5 * 60 * 1000; // Within 5 minutes
        });
        
        if (sameTimeSessions.length > 1) {
          // For sessions at the same time, use more uniform heights
          const maxHeightPerStackedSession = Math.max(8, 60 / sameTimeSessions.length);
          const finalHeight = Math.max(5, Math.min(maxHeightPerStackedSession, percentage));
          return finalHeight;
        } else {
          // For sessions at different times, use their actual calculated height
          const finalHeight = Math.max(2, Math.min(90, percentage));
          return finalHeight;
        }
      }
      
      // For single session, use calculated height but limit to reasonable size
      const finalHeight = Math.max(2, Math.min(90, percentage));
      return finalHeight;
    } catch (error) {
      console.error('Error calculating session height:', error);
      return 8; // Default height for error cases
    }
  }


  getSessionTooltip(session: any): string {
    const punchIn = session.punchIn || 'N/A';
    const punchOut = session.punchOut || 'Active';
    return `${this.getSessionStatus(session)} - ${punchIn} to ${punchOut} (${session.totalHoursFormatted})`;
  }

  isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }

  onDayHover(day: any) {
    this.selectedDay = day;
    this.tooltipVisible = true;
  }

  onDayLeave() {
    this.tooltipVisible = false;
    this.selectedDay = null;
  }

  // Weekly view methods
  initializeWeeklyView() {
    // Set current week start to the beginning of the current week (Sunday)
    // Use the selected month/year instead of current date
    const selectedDate = new Date(this.selectedYear, this.selectedMonth, 1);
    const today = new Date();
    
    // If viewing current month, use today's date, otherwise use the 1st of the month
    const referenceDate = (today.getFullYear() === this.selectedYear && today.getMonth() === this.selectedMonth) 
      ? today 
      : selectedDate;
    
    const dayOfWeek = referenceDate.getDay();
    this.currentWeekStart = new Date(referenceDate);
    this.currentWeekStart.setDate(referenceDate.getDate() - dayOfWeek);
    this.currentWeekStart.setHours(0, 0, 0, 0);
    
    this.generateWeeklyCalendarDays();
  }

  generateWeeklyCalendarDays() {
    this.weeklyCalendarDays = [];
    
    
    // Generate 7 days starting from currentWeekStart
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Get sessions for this day from detailed sessions data
      const daySessions = this.detailedSessionsData.filter(record => {
        // Handle both string and Date formats
        let recordDate: Date;
        if (typeof record.date === 'string') {
          // If it's a string, parse it directly
          recordDate = new Date(record.date);
        } else {
          recordDate = record.date;
        }
        
        // Compare dates properly
        return recordDate.getDate() === date.getDate() && 
               recordDate.getMonth() === date.getMonth() && 
               recordDate.getFullYear() === date.getFullYear();
      });



      this.weeklyCalendarDays.push({
        date: date,
        dayNumber: date.getDate(),
        dayName: dayName,
        monthName: monthName,
        sessions: daySessions
      });
    }
  }

  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.generateWeeklyCalendarDays();
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.generateWeeklyCalendarDays();
  }

  setCalendarView(view: 'week' | 'month') {
    this.calendarView = view;
    if (view === 'week') {
      this.generateWeeklyCalendarDays();
    } else {
      this.generateCalendarDays();
    }
  }

  setTimePeriodView(period: 'am' | 'pm') {
    this.timePeriodView = period;
    this.generateTimeSlots();
  }

  getCurrentWeekRange(): string {
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(this.currentWeekStart.getDate() + 6);
    
    const startMonth = this.currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${this.currentWeekStart.getDate()} - ${weekEnd.getDate()}`;
    } else {
      return `${startMonth} ${this.currentWeekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}`;
    }
  }

  getCurrentWeekYear(): string {
    return this.currentWeekStart.getFullYear().toString();
  }

  isFirstWeek(): boolean {
    // Check if we're at the beginning of the selected month
    const monthStart = new Date(this.selectedYear, this.selectedMonth, 1);
    const weekEnd = new Date(this.currentWeekStart);
    weekEnd.setDate(this.currentWeekStart.getDate() + 6);
    
    return weekEnd < monthStart;
  }

  isLastWeek(): boolean {
    // Check if we're at the end of the selected month
    const monthEnd = new Date(this.selectedYear, this.selectedMonth + 1, 0);
    
    return this.currentWeekStart > monthEnd;
  }

  // Multiple sessions methods
  getOrderedSessions(sessions: any[]): any[] {
    if (!sessions || sessions.length === 0) return [];
    
    // Filter sessions by current time period view
    const filteredSessions = sessions.filter(session => {
      if (!session.punchInDateTime) return false;
      
      // Parse the formatted time string to get correct local time
      const formattedTime = this.formatTime(session.punchInDateTime);
      const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      
      if (!timeMatch) return false;
      
      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === 'AM' && hour === 12) {
        hour = 0;
      } else if (period === 'PM' && hour !== 12) {
        hour += 12;
      }
      
      if (this.timePeriodView === 'am') {
        // AM view: show sessions from 0 (12 AM) to 11 (11 AM)
        return hour >= 0 && hour <= 11;
      } else {
        // PM view: show sessions from 12 (12 PM) to 23 (11 PM), and 0 (12 AM)
        return hour >= 12 || hour === 0;
      }
    });
    
    // Sort filtered sessions by punch-in time
    const sortedSessions = filteredSessions.sort((a, b) => {
      if (!a.punchInDateTime || !b.punchInDateTime) return 0;
      const timeA = new Date(a.punchInDateTime).getTime();
      const timeB = new Date(b.punchInDateTime).getTime();
      return timeA - timeB;
    });
    
    
    return sortedSessions;
  }



  getSessionZIndex(sessions: any[], sessionIndex: number): number {
    // Later sessions (higher index) get higher z-index to appear on top
    return 10 + sessionIndex;
  }

  getSessionLeftPosition(session: any, sessions: any[], sessionIndex: number): number {
    // Always use consistent left position for cleaner look
    return 4; // Default left position for all sessions
  }

  getSessionWidth(session: any, sessions: any[], sessionIndex: number): number {
    // Always use consistent width for cleaner look
    return 92; // Default width for all sessions
  }

  shouldShowSessionTime(session: any): boolean {
    if (!session.punchInDateTime) return false;
    
    try {
      const punchInTime = new Date(session.punchInDateTime);
      let durationMinutes: number;
      
      if (!session.punchOutDateTime) {
        // Active session - calculate duration from start to now
        const now = new Date();
        const durationMs = now.getTime() - punchInTime.getTime();
        durationMinutes = durationMs / (1000 * 60);
      } else {
        // Completed session - use actual duration
        const punchOutTime = new Date(session.punchOutDateTime);
        const durationMs = punchOutTime.getTime() - punchInTime.getTime();
        durationMinutes = durationMs / (1000 * 60);
      }
      
      // Only show time text if session is at least 5 minutes long
      return durationMinutes >= 5;
    } catch (error) {
      return false;
    }
  }

  // Debug method to get time slot positions for comparison
  getTimeSlotPositions(): any[] {
    return this.timeSlots.map((slot, index) => {
      const percentage = (index * 60) / 720 * 100;
      return {
        time: slot.time,
        hour: slot.hour,
        percentage: percentage,
        pixelPosition: index * 60
      };
    });
  }

  onSessionHover(session: any, event: MouseEvent) {
    this.hoveredSession = session;
    
    // Get the session element's position relative to the calendar container
    const sessionElement = event.target as HTMLElement;
    const calendarContainer = sessionElement.closest('.calendar-container');
    
    if (calendarContainer) {
      const containerRect = calendarContainer.getBoundingClientRect();
      const sessionRect = sessionElement.getBoundingClientRect();
      
      // Calculate session position relative to calendar container
      const sessionLeft = sessionRect.left - containerRect.left;
      const sessionTop = sessionRect.top - containerRect.top;
      const sessionRight = sessionRect.right - containerRect.left;
      const sessionBottom = sessionRect.bottom - containerRect.top;
      
      // Get calendar container dimensions
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calculate quadrant based on session position
      const isLeftHalf = sessionLeft < containerWidth / 2;
      const isTopHalf = sessionTop < containerHeight / 2;
      
      // Determine tooltip position based on quadrant
      if (isLeftHalf && isTopHalf) {
        // Part 1 (Top Left) - Show tooltip on bottom right
        this.sessionTooltipX = sessionRight + 10;
        this.sessionTooltipY = sessionBottom + 10;
        this.tooltipPosition = 'bottom-right';
      } else if (!isLeftHalf && isTopHalf) {
        // Part 2 (Top Right) - Show tooltip on bottom left
        this.sessionTooltipX = sessionLeft - 10; // Will be adjusted by CSS
        this.sessionTooltipY = sessionBottom + 10;
        this.tooltipPosition = 'bottom-left';
      } else if (isLeftHalf && !isTopHalf) {
        // Part 3 (Bottom Left) - Show tooltip on top right
        this.sessionTooltipX = sessionRight + 10;
        this.sessionTooltipY = sessionTop - 10; // Will be adjusted by CSS
        this.tooltipPosition = 'top-right';
      } else {
        // Part 4 (Bottom Right) - Show tooltip on top left
        this.sessionTooltipX = sessionLeft - 10; // Will be adjusted by CSS
        this.sessionTooltipY = sessionTop - 10; // Will be adjusted by CSS
        this.tooltipPosition = 'top-left';
      }
    } else {
      // Fallback to mouse position if container not found
      this.sessionTooltipX = event.clientX + 10;
      this.sessionTooltipY = event.clientY - 10;
      this.tooltipPosition = 'bottom-right';
    }
    
    // Hide day tooltip when hovering over session
    this.tooltipVisible = false;
  }

  onSessionLeave() {
    this.hoveredSession = null;
  }

  // Location tracking methods
  viewLocationTracking(sessionId: number) {
    this.selectedSessionId = sessionId;
    this.showLocationModal = true;
    this.loadingLocationData = true;
    this.locationData = [];

    this.locationLogService.getLocationLogsBySession(sessionId).subscribe({
      next: (data) => {
        this.locationData = data;
        this.loadingLocationData = false;
        
        // Initialize map after data is loaded
        setTimeout(() => {
          this.initializeMap();
        }, 100);
      },
      error: (error) => {
        this.loadingLocationData = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load location data',
          life: 3000
        });
      }
    });
  }

  closeLocationModal() {
    // Clean up map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    this.showLocationModal = false;
    this.selectedSessionId = null;
    this.locationData = [];
  }

  formatLocationTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  getLocationInterval(index: number): string {
    if (index === 0) return 'Start';
    if (index === this.locationData.length - 1) return 'End';
    
    const current = new Date(this.locationData[index].logTimestamp);
    const previous = new Date(this.locationData[index - 1].logTimestamp);
    const diffMinutes = Math.round((current.getTime() - previous.getTime()) / (1000 * 60));
    
    return `+${diffMinutes}m`;
  }

  initializeMap() {
    if (this.locationData.length === 0) return;

    const mapContainer = document.getElementById('locationMap');
    if (!mapContainer) return;

    // Clear previous content
    mapContainer.innerHTML = '';

    // Destroy existing map if it exists
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Create Leaflet map
    this.map = L.map('locationMap').setView([0, 0], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Create route coordinates
    const routeCoordinates: L.LatLng[] = this.locationData.map(location => 
      L.latLng(location.locationLat, location.locationLong)
    );

    // Add route polyline
    if (routeCoordinates.length > 1) {
      const routePolyline = L.polyline(routeCoordinates, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.8
      }).addTo(this.map);

      // Fit map to show the entire route
      this.map.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
    }

    // Add markers for each location point
    this.locationData.forEach((location, index) => {
      const marker = L.marker([location.locationLat, location.locationLong], {
        icon: this.createCustomMarker(index + 1)
      }).addTo(this.map!);

      // Add popup with location details
      marker.bindPopup(`
        <div class="p-2">
          <h4 class="font-semibold text-gray-900 mb-2">Point ${index + 1}</h4>
          <p class="text-sm text-gray-600 mb-1">
            <strong>Time:</strong> ${this.formatLocationTime(location.logTimestamp)}
          </p>
          <p class="text-sm text-gray-600 mb-1">
            <strong>Lat:</strong> ${location.locationLat.toFixed(6)}
          </p>
          <p class="text-sm text-gray-600">
            <strong>Lng:</strong> ${location.locationLong.toFixed(6)}
          </p>
        </div>
      `);
    });

    // Add start and end markers with different colors
    if (routeCoordinates.length > 0) {
      // Start marker (green)
      L.marker(routeCoordinates[0], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: '<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">S</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map).bindPopup('<strong>Start Point</strong>');

      // End marker (red)
      if (routeCoordinates.length > 1) {
        L.marker(routeCoordinates[routeCoordinates.length - 1], {
          icon: L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">E</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(this.map).bindPopup('<strong>End Point</strong>');
      }
    }
  }

  private createCustomMarker(number: number): L.DivIcon {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">${number}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }
}