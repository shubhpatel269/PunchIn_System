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

interface AttendanceRecord {
  date: string;
  day: string;
  punchIn: string | null;
  punchOut: string | null;
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

  // Table data
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  
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
    private employeeService: EmployeeService
  ) {}

  ngOnInit() {
    // Check if this is an admin viewing a specific employee
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isAdminView = true;
        this.viewingEmployeeId = params['id'];
        this.loadEmployeeData(params['id']);
      } else {
        this.loadUserData();
      }
    });
    
    this.loadAttendanceData();
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

    // 2. Load detailed sessions data (individual sessions)
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

    console.log('Loading detailed sessions data:', {
      employeeId: this.user.employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isCurrentMonth
    });

    this.attendanceService.getAttendanceSummary(this.user.employeeId, startDate, endDate)
      .subscribe({
        next: (response) => {
          // Transform the detailed attendance data for detailed sessions table (individual sessions)
          this.detailedSessionsData = this.transformApiDataToRecords(response.records);
          this.filteredDetailedRecords = [...this.detailedSessionsData];
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
          this.filteredDetailedRecords = [];
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
    // Debug the received data
    console.log('Combined data received:', {
      totalWorkHours: combinedData.totalWorkHours,
      averageDailyHours: combinedData.averageDailyHours,
      presentDays: combinedData.presentDays,
      lateDays: combinedData.lateDays,
      halfDays: combinedData.halfDays,
      workingDays: combinedData.workingDays
    });
    
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
    
    console.log('Monthly stats calculated:', this.monthlyStats);
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
  }

  onYearChange() {
    this.loadAttendanceData();
    this.initializeCharts();
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

  private formatDateForDisplay(dateString: string): string {
    try {
      // Handle UTC timestamps properly by adding 'Z' if not present
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
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
}