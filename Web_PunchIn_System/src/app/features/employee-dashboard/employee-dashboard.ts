import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
// Removed p-dropdown usage in favor of native select
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../shared/services/auth.service';
import { SessionService } from '../../shared/services/session.service';
import { BreakService } from '../../shared/services/break.service';
import { AttendanceService } from '../../shared/services/attendance.service';
import { EmployeeService, TodayStatus, CombinedAttendanceResponse } from '../../shared/services/employee.service';
import { MonthlyAttendanceOverviewDTO } from '../../shared/services/employee.service';
import { WelcomePopupComponent } from './welcome-popup.component';

interface AttendanceRecord {
  date: string;
  sessionStart: string | null;
  sessionEnd: string | null;
  totalHours: string;
  totalBreak: string;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  holidays: number;
  attendancePercentage: number;
  totalHours: number;
  averageHours: number;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    BadgeModule,
    ProgressBarModule,
    ChartModule,
    DividerModule,
    AvatarModule,
    TagModule,
    ToastModule,
    WelcomePopupComponent
  ],
  providers: [MessageService],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  user: any = null;
  employeeProfile: any = null;
  currentTime: string = '';
  userTimezone: string = '';
  todayAttendance: AttendanceRecord | null = null;
  attendanceStats: AttendanceStats = {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    holidays: 0,
    attendancePercentage: 0,
    totalHours: 0,
    averageHours: 0
  };
  
  // Chart data
  attendanceChartData: any;
  hoursChartData: any;
  chartOptions: any;
  attendanceChartOptions: any;

  // Recent attendance data from API
  recentAttendance: AttendanceRecord[] = [];

  // Welcome popup properties
  showWelcomePopup: boolean = false;
  welcomeUserData: any = {};

  // Today status from API
  todayStatus: TodayStatus | null = null;
  
  // Combined attendance data for charts
  combinedAttendanceData: CombinedAttendanceResponse | null = null;
  dailySummaryRecords: any[] = [];
  
  private dashboardRefreshInterval: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private authService: AuthService,
    private sessionService: SessionService,
    private breakService: BreakService,
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService
  ) {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit() {
    this.loadUserData();
    this.loadEmployeeProfile();
    this.loadTodayAttendance();
    this.loadRecentAttendance();
    
    // Initialize attendance chart options
    this.initializeAttendanceChartOptions();
    
    // Load month overview for attendance statistics (includes hours chart data)
    this.loadMonthOverview();

    // Detect user timezone (for displaying recent attendance times)
    try {
      this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      this.userTimezone = '';
    }

    // Restore break state from storage or URL
    this.restoreBreakState();

    // Load today's status from API (self)
    this.loadTodayStatus();

    // Start 30s auto-refresh for necessary endpoints
    this.dashboardRefreshInterval = setInterval(() => {
      this.loadTodayStatus();
      this.loadRecentAttendance();
      this.loadMonthOverview(); // Refresh attendance and hours chart data
    }, 30000);

    // Load current month overview once on init
    this.loadMonthOverview();

    // Check if welcome popup should be shown (one-time only)
    this.checkWelcomePopup();
  }

  ngOnDestroy() {
    if (this.dashboardRefreshInterval) {
      clearInterval(this.dashboardRefreshInterval);
      this.dashboardRefreshInterval = null;
    }
  }

  initializeCharts() {
    // Attendance distribution chart
    this.attendanceChartData = {
      labels: ['Present', 'Absent', 'Half Day', 'Holiday'],
      datasets: [{
        data: [
          this.attendanceStats.presentDays,
          this.attendanceStats.absentDays,
          this.attendanceStats.halfDays,
          this.attendanceStats.holidays
        ],
        backgroundColor: ['#10B981', '#EF4444', '#3B82F6', '#6B7280'],
        borderWidth: 0
      }]
    };

    // Daily hours trend chart (last 7 days)
    const dailyData = this.getLast7DaysHoursData();
    const dayLabels = this.getLast7DaysLabels();
    
    this.hoursChartData = {
      labels: dayLabels,
      datasets: [{
        label: 'Hours Worked',
        data: dailyData,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };
  }

  initializeAttendanceChartOptions() {
    // Attendance distribution chart options (doughnut chart)
    this.attendanceChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };

    // Hours chart options (line chart)
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              return `Hours: ${this.formatHoursFromDecimal(hours)}`;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true,
          max: 12,
          ticks: {
            callback: (value: any) => `${value}h`
          }
        } 
      }
    };
  }

  calculateMonthlyStatsFromCombined(combinedData: CombinedAttendanceResponse) {
    // Use the summary data directly from the combined API
    this.attendanceStats = {
      totalDays: combinedData.totalDays,
      presentDays: combinedData.presentDays,
      absentDays: combinedData.absentDays,
      lateDays: combinedData.lateDays,
      halfDays: combinedData.halfDays,
      holidays: combinedData.holidayDaysTillCurrent, // Use holidays till current date
      attendancePercentage: combinedData.attendanceRate,
      totalHours: this.parseTimeSpan(combinedData.totalWorkHours),
      averageHours: combinedData.averageDailyHours
    };
  }

  private parseTimeSpan(timeSpanString: string): number {
    // Parse TimeSpan string like "08:30:00" to hours
    if (!timeSpanString || timeSpanString === '00:00:00') {
      return 0;
    }
    
    const parts = timeSpanString.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return hours + (minutes / 60);
    }
    
    return 0;
  }

  transformCombinedDataToRecords(combinedData: CombinedAttendanceResponse): any[] {
    // Transform the daily summary data from combined API to records format
    return combinedData.dailyRecords.map(record => {
      const parsedHours = this.parseTimeSpan(record.totalWorkHours);
      
      return {
        date: record.date.split('T')[0], // Store only the date part (YYYY-MM-DD)
        day: new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
        punchIn: record.firstPunchIn,
        punchOut: record.lastPunchOut,
        totalHours: parsedHours,
        totalHoursFormatted: this.formatWorkTime(parsedHours),
        status: this.getAttendanceStatus(record),
        totalBreak: this.parseTimeSpan(record.totalBreakTime),
        totalBreakFormatted: this.formatWorkTime(this.parseTimeSpan(record.totalBreakTime)),
        sessionCount: record.sessionCount,
        breakCount: record.breakCount
      };
    });
  }

  private getAttendanceStatus(record: any): string {
    if (record.isHoliday) return 'holiday';
    if (record.totalWorkHours === '00:00:00') return 'absent';
    if (this.parseTimeSpan(record.totalWorkHours) < 4) return 'half-day';
    return 'present';
  }

  private formatWorkTime(hours: number): string {
    if (hours === 0) return '0h';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}m`;
    }
  }

  getLast7DaysHoursData(): number[] {
    const days = [0, 0, 0, 0, 0, 0, 0]; // 7 days
    const today = new Date();
    
    // Create a map of dates to hours for easy lookup
    // Handle both date formats: "2025-10-07" and "2025-10-07T00:00:00"
    const dateToHoursMap = new Map();
    this.dailySummaryRecords.forEach(record => {
      // Extract just the date part (YYYY-MM-DD) from the record date
      const recordDate = record.date.split('T')[0];
      dateToHoursMap.set(recordDate, record.totalHours || 0);
    });
    
    // Get last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const hours = dateToHoursMap.get(dateString) || 0;
      days[6 - i] = hours;
    }
    
    return days;
  }

  getLast7DaysLabels(): string[] {
    const labels = [];
    const today = new Date();
    
    // Get last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Format as "MMM DD" (e.g., "Oct 07")
      const dayLabel = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit' 
      });
      labels.push(dayLabel);
    }
    
    return labels;
  }

  initializeFallbackCharts() {
    // Fallback chart data when combined API fails
    // Initialize attendance chart with current stats
    this.attendanceChartData = {
      labels: ['Present', 'Absent', 'Half Day', 'Holiday'],
      datasets: [{
        data: [
          this.attendanceStats.presentDays,
          this.attendanceStats.absentDays,
          this.attendanceStats.halfDays,
          this.attendanceStats.holidays
        ],
        backgroundColor: ['#10B981', '#EF4444', '#3B82F6', '#6B7280'],
        borderWidth: 0
      }]
    };
    
    // Initialize hours chart with recent attendance data
    this.initializeHoursChartFromRecentAttendance();
  }

  initializeHoursChartFromRecentAttendance() {
    // Create daily data from recent attendance
    const today = new Date();
    const dailyData = [];
    const dayLabels = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Find attendance record for this date
      const record = this.recentAttendance.find(r => r.date === dateString);
      const hours = record ? this.parseHours(record.totalHours) : 0;
      
      dailyData.push(hours);
      dayLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }));
    }
    
    this.hoursChartData = {
      labels: dayLabels,
      datasets: [{
        label: 'Hours Worked',
        data: dailyData,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    };
  }

  private parseHours(timeString: string): number {
    // Parse time string like "8h 30m" or "8.5h" to decimal hours
    if (!timeString) return 0;
    
    const match = timeString.match(/(\d+)h(?:\s*(\d+)m)?/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      return hours + (minutes / 60);
    }
    
    // Try to parse as decimal hours
    const decimalMatch = timeString.match(/(\d+\.?\d*)h?/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }
    
    return 0;
  }

  loadUserData() {
    const userData = localStorage.getItem('punchInUser');
    if (userData) {
      this.user = JSON.parse(userData);
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadEmployeeProfile() {
    if (this.user?.employeeId) {
      this.employeeService.getEmployeeById(this.user.employeeId).subscribe({
        next: (employee: any) => {
          this.employeeProfile = employee;
        },
        error: (error) => {
          console.error('Error loading employee profile:', error);
          // Don't show error to user as this is not critical for dashboard functionality
        }
      });
    }
  }

  loadTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = this.recentAttendance.find(record => record.date === today);
    
    if (todayRecord) {
      this.todayAttendance = todayRecord;
    } else {
      // Check if user has punched in today
      const punchInTime = localStorage.getItem('todayPunchIn');
      if (punchInTime) {
        this.todayAttendance = {
          date: today,
          sessionStart: punchInTime,
          sessionEnd: null,
          totalHours: '00:00:00',
          totalBreak: '00:00:00'
        };
      }
    }
  }

  loadRecentAttendance() {
    const employeeId = this.user?.employeeId;
    if (employeeId) {
      this.attendanceService.getRecentAttendance(employeeId).subscribe({
        next: (data) => {
          this.recentAttendance = data;
          // Only initialize fallback charts if combined API hasn't loaded yet
          if (!this.combinedAttendanceData) {
            this.initializeHoursChartFromRecentAttendance();
          }
        },
        error: (err) => {
          console.error('Failed to load recent attendance:', err);
          this.messageService.add({
            severity: 'warn',
            summary: 'Data Load Failed',
            detail: 'Could not load recent attendance data.',
            life: 3000
          });
        }
      });
    }
  }

  // New method to load last 7 days working hours for better trend chart
  loadLast7DaysWorkingHours() {
    // Calculate the date range for the last 7 days
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Include today, so 6 days ago + today = 7 days
    
    // Get data for current month first
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12 format
    
    this.employeeService.getSelfCombinedAttendance(currentYear, currentMonth).subscribe({
      next: (data) => {
        // If we need data from previous month, get that too
        const needPreviousMonth = sevenDaysAgo.getMonth() !== today.getMonth() || 
                                 sevenDaysAgo.getFullYear() !== today.getFullYear();
        
        if (needPreviousMonth) {
          const prevYear = sevenDaysAgo.getFullYear();
          const prevMonth = sevenDaysAgo.getMonth() + 1; // 1-12 format
          
          this.employeeService.getSelfCombinedAttendance(prevYear, prevMonth).subscribe({
            next: (prevData) => {
              this.initializeHoursChartFromCombinedData(data, prevData, sevenDaysAgo, today);
            },
            error: (err) => {
              console.error('Failed to load previous month data:', err);
              // Use only current month data
              this.initializeHoursChartFromCombinedData(data, null, sevenDaysAgo, today);
            }
          });
        } else {
          // Only current month needed
          this.initializeHoursChartFromCombinedData(data, null, sevenDaysAgo, today);
        }
      },
      error: (err) => {
        console.error('Failed to load combined attendance data:', err);
        // Fallback to recent attendance if combined data fails
        this.loadRecentAttendance();
      }
    });
  }

  loadAttendanceStats() {
    // Calculate stats from recent attendance
    const totalDays = this.recentAttendance.length;
    const presentDays = this.recentAttendance.filter(r => r.sessionStart && r.sessionEnd).length;
    const absentDays = this.recentAttendance.filter(r => !r.sessionStart && !r.sessionEnd).length;
    const lateDays = this.recentAttendance.filter(r => r.sessionStart && this.isLate(r.sessionStart)).length;
    const totalHours = this.recentAttendance.reduce((sum, r) => sum + this.parseHours(r.totalHours), 0);

    this.attendanceStats = {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays: 0, // Set to 0 for now
      holidays: 0, // Set to 0 for now
      attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      totalHours,
      averageHours: totalDays > 0 ? totalHours / totalDays : 0
    };
  }

  private isLate(sessionStart: string): boolean {
    // Check if session start is after 9:00 AM
    const startTime = new Date(sessionStart);
    const lateTime = new Date(startTime);
    lateTime.setHours(9, 0, 0, 0);
    return startTime > lateTime;
  }


  // Helper method to parse hours string to decimal for chart data
  private parseHoursToDecimal(timeString: string): number {
    if (!timeString || timeString === '00:00:00') return 0;
    return this.parseHours(timeString);
  }

  // Helper method to parse TimeSpan string to decimal for chart data
  private parseTimeSpanToDecimal(timeSpanString: string): number {
    if (!timeSpanString || timeSpanString === '00:00:00') return 0;
    return this.parseHours(timeSpanString);
  }

  // Helper method to format decimal hours back to readable format
  private formatHoursFromDecimal(decimalHours: number): string {
    if (decimalHours === 0) return '0h';
    
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }

  initializeHoursChartFromRecent() {
    // Create a map of dates to records for easier lookup
    const recordsMap = new Map();
    this.recentAttendance.forEach(record => {
      recordsMap.set(record.date, record);
    });
    
    // Generate last 7 days with proper date handling
    const today = new Date();
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);
      const dateString = currentDate.toISOString().split('T')[0];
      
      const record = recordsMap.get(dateString);
      if (record) {
        last7Days.push(record);
      } else {
        // Create empty record for missing day
        last7Days.push({
          date: dateString,
          totalHours: '00:00:00'
        });
      }
    }
    
    this.hoursChartData = {
      labels: last7Days.map(record => {
        const date = new Date(record.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Hours Worked',
        data: last7Days.map(record => this.parseHoursToDecimal(record.totalHours)),
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              return `Hours: ${this.formatHoursFromDecimal(hours)}`;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true, 
          max: 12,
          ticks: {
            callback: (value: any) => {
              return `${value}h`;
            }
          }
        }
      }
    };
  }

  // New method to initialize hours chart from combined attendance data
  initializeHoursChartFromCombinedData(currentData: any, previousData: any = null, startDate: Date, endDate: Date) {
    // Combine daily records from both months if available
    let allDailyRecords: any[] = [];
    
    if (previousData && previousData.dailyRecords) {
      allDailyRecords = [...previousData.dailyRecords];
    }
    
    if (currentData && currentData.dailyRecords) {
      allDailyRecords = [...allDailyRecords, ...currentData.dailyRecords];
    }
    
    // Filter records for the last 7 days
    const last7DaysRecords = allDailyRecords.filter((record: any) => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
    
    // Sort by date to ensure proper order
    last7DaysRecords.sort((a: any, b: any) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // If we don't have enough records, create empty entries for missing days
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const existingRecord = last7DaysRecords.find((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === currentDate.toDateString();
      });
      
      if (existingRecord) {
        last7Days.push(existingRecord);
      } else {
        // Create empty record for missing day
        last7Days.push({
          date: currentDate.toISOString().split('T')[0],
          totalWorkHours: '00:00:00'
        });
      }
    }
    
    this.hoursChartData = {
      labels: last7Days.map((record: any) => {
        const date = new Date(record.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Hours Worked',
        data: last7Days.map((record: any) => this.parseTimeSpanToDecimal(record.totalWorkHours)),
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
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const hours = context.parsed.y;
              return `Hours: ${this.formatHoursFromDecimal(hours)}`;
            }
          }
        }
      },
      scales: { 
        y: { 
          beginAtZero: true, 
          max: 12,
          ticks: {
            callback: (value: any) => {
              return `${value}h`;
            }
          }
        }
      }
    };
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }

  punchOut() {
    if (!this.todayAttendance?.sessionStart) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Session Start',
        detail: 'You need to start a session first before ending it.',
        life: 3000
      });
      return;
    }

    if (this.todayAttendance.sessionEnd) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Already Ended Session',
        detail: 'You have already ended your session for today.',
        life: 3000
      });
      return;
    }

    const sessionEndTime = new Date().toISOString();
    this.todayAttendance.sessionEnd = sessionEndTime;
    
    // Calculate total hours
    const sessionStartTime = new Date(this.todayAttendance.sessionStart);
    const sessionEndTimeDate = new Date(sessionEndTime);
    const diffMs = sessionEndTimeDate.getTime() - sessionStartTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    this.todayAttendance.totalHours = this.formatTimeSpan(diffHours);
    const totalHours = this.todayAttendance ? this.formatHours(this.todayAttendance.totalHours) : '0s';

    const sessionIdStr = localStorage.getItem('activeSessionId');
    const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
    const payload = {
      sessionStatus: 'completed',
      sessionEndTime: new Date().toISOString(),
      sessionBreakTime: null
    };

    if (sessionId) {
      this.sessionService.endSession(sessionId, payload).subscribe({
        next: () => {
          localStorage.removeItem('activeSessionId');
          localStorage.removeItem('activePunchId');
          localStorage.removeItem('punchInUser');
          this.messageService.add({
            severity: 'success',
            summary: 'Punch Out Successful',
            detail: `You ended session at ${this.formatTime(sessionEndTime)}. Total hours: ${totalHours}`,
            life: 3000
          });
          this.router.navigate(['/login']);
        },
        error: () => {
          // Navigate even if session end fails
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  private activeBreakId: number | null = null;
  isOnBreak: boolean = false;
  currentBreakType: string = 'general';
  breakTypes = [
    { label: 'General', value: 'general' },
    { label: 'Lunch', value: 'lunch' },
    { label: 'Tea/Coffee', value: 'tea' },
    { label: 'Personal', value: 'personal' }
  ];

  // Single-array break state storage
  // Format: [breakId:number, breakType:string, breakStartISO:string, on:'1'|'0']
  private BREAK_STORAGE_KEY = 'bs';
  private BREAK_URL_PARAM = 'b';
  private BREAK_PASSPHRASE = 'punchin-web-aes-passphrase-v1'; // rotate when needed
  private BREAK_SALT = 'punchin-web-aes-salt-v1';

  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  private base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private base64UrlDecode(str: string): ArrayBuffer {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  private async deriveKey(): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.textEncoder.encode(this.BREAK_PASSPHRASE),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.textEncoder.encode(this.BREAK_SALT),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptToUrl(plain: string): Promise<string> {
    const key = await this.deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, this.textEncoder.encode(plain));
    const ivStr = this.base64UrlEncode(iv.buffer);
    const ctStr = this.base64UrlEncode(cipher);
    return `${ivStr}.${ctStr}`;
  }

  private async decryptFromUrl(token: string): Promise<string | null> {
    try {
      const [ivStr, ctStr] = token.split('.');
      if (!ivStr || !ctStr) return null;
      const key = await this.deriveKey();
      const iv = new Uint8Array(this.base64UrlDecode(ivStr));
      const cipher = this.base64UrlDecode(ctStr);
      const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
      return this.textDecoder.decode(plainBuf);
    } catch {
      return null;
    }
  }

  private async updateUrlWithBreakArray(arr: [number, string, string, '1' | '0'] | null) {
    if (!arr) {
      this.router.navigate([], { queryParams: { [this.BREAK_URL_PARAM]: null }, queryParamsHandling: 'merge', relativeTo: this.route });
      return;
    }
    const token = await this.encryptToUrl(JSON.stringify(arr));
    this.router.navigate([], { queryParams: { [this.BREAK_URL_PARAM]: token }, queryParamsHandling: 'merge', relativeTo: this.route });
  }

  private async tryLoadBreakFromUrl(): Promise<[number, string, string, '1' | '0'] | null> {
    const qp = this.route.snapshot.queryParamMap.get(this.BREAK_URL_PARAM);
    if (!qp) return null;
    const decoded = await this.decryptFromUrl(qp);
    if (!decoded) return null;
    try {
      const arr = JSON.parse(decoded);
      if (Array.isArray(arr) && arr.length >= 4) return [arr[0], arr[1], arr[2], arr[3]];
      return null;
    } catch {
      return null;
    }
  }

  private async restoreBreakState() {
    // First try localStorage single array
    const token = localStorage.getItem(this.BREAK_STORAGE_KEY);
    if (token) {
      const decoded = await this.decryptFromUrl(token);
      if (decoded) {
        try {
          const arr = JSON.parse(decoded) as [number, string, string, '1' | '0'];
          if (Array.isArray(arr) && arr[3] === '1') {
            this.activeBreakId = Number(arr[0]);
            this.currentBreakType = String(arr[1]);
            this.isOnBreak = true;
            return;
          }
        } catch {}
      }
    }
    // Fallback: URL param
    const arr = await this.tryLoadBreakFromUrl();
    if (arr && arr[3] === '1') {
      this.activeBreakId = Number(arr[0]);
      this.currentBreakType = String(arr[1]);
      this.isOnBreak = true;
      // Sync encrypted token to localStorage for future loads
      this.encryptToUrl(JSON.stringify(arr)).then(token => {
        localStorage.setItem(this.BREAK_STORAGE_KEY, token);
      });
    }
  }

  async takeBreak() {
    const sessionIdStr = localStorage.getItem('activeSessionId');
    const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
    const employeeId = this.user?.employeeId || JSON.parse(localStorage.getItem('punchInUser') || '{}')?.employeeId;

    if (!sessionId || !employeeId) {
      this.messageService.add({ severity: 'warn', summary: 'Cannot Start Break', detail: 'No active session found.', life: 3000 });
      return;
    }

    if (!this.isOnBreak) {
      const payload = {
        sessionId,
        employeeId,
        breakStart: new Date().toISOString(),
        breakEnd: null,
        breakType: this.currentBreakType
      };
      this.breakService.startBreak(payload).subscribe({
        next: (res) => {
          this.activeBreakId = res?.breakId ?? res?.id ?? null;
          this.isOnBreak = true;
          const stateArr: [number, string, string, '1'] | null = this.activeBreakId ? [this.activeBreakId, this.currentBreakType, payload.breakStart, '1'] : null;
          if (stateArr) {
            // store encrypted token in localStorage and URL
            this.encryptToUrl(JSON.stringify(stateArr)).then(token => {
              localStorage.setItem(this.BREAK_STORAGE_KEY, token);
            });
            this.updateUrlWithBreakArray(stateArr);
          }
          this.messageService.add({ severity: 'info', summary: 'Break Started', detail: 'Enjoy your break!', life: 3000 });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Break Failed', detail: 'Could not start break.', life: 3000 });
        }
      });
    } else if (this.activeBreakId) {
      const payload = {
        breakEnd: new Date().toISOString(),
        breakType: this.currentBreakType
      };
      this.breakService.endBreak(this.activeBreakId, payload).subscribe({
        next: () => {
          this.isOnBreak = false;
          this.activeBreakId = null;
          localStorage.removeItem(this.BREAK_STORAGE_KEY);
          this.updateUrlWithBreakArray(null);
          this.messageService.add({ severity: 'success', summary: 'Break Ended', detail: 'Welcome back!', life: 3000 });
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Break End Failed', detail: 'Could not end break.', life: 3000 });
        }
      });
    }
  }

  viewAttendance() {
    this.router.navigate(['/employee/attendance']);
  }

  viewProfile() {
    this.router.navigate(['/employee/profile']);
  }

  private loadTodayStatus() {
    this.employeeService.getSelfTodayStatus().subscribe({
      next: (status) => {
        this.todayStatus = status;
        // If API provides isOnBreak, reflect into UI state without overriding active break id
        if (typeof status.isOnBreak === 'boolean') {
          this.isOnBreak = status.isOnBreak || this.isOnBreak;
        }
        // Patch today's attendance card if present
        if (status.sessionStart) {
          this.todayAttendance = this.todayAttendance || {
            date: new Date().toISOString().split('T')[0],
            sessionStart: null,
            sessionEnd: null,
            totalHours: '00:00:00',
            totalBreak: '00:00:00'
          };
          this.todayAttendance.sessionStart = status.sessionStart;
          this.todayAttendance.sessionEnd = status.sessionEnd;
          this.todayAttendance.totalBreak = status.totalBreakDuration;
          this.todayAttendance.totalHours = status.elapsedWorkDuration;
        }
      },
      error: (err) => {
        console.error('TodayStatus API error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Today Status Error',
          detail: 'Failed to load today\'s status. Please try again.',
          life: 3000
        });
      }
    });
  }

  getTodayBreakDisplay(): string {
    const api = this.todayStatus?.totalBreakDuration;
    if (api && api !== '00:00:00') return this.formatHours(api);
    const local = this.todayAttendance?.totalBreak;
    return local ? this.formatHours(local) : '0s';
  }

  getTodayElapsedWorkDisplay(): string {
    const api = this.todayStatus?.elapsedWorkDuration;
    if (api && api !== '00:00:00') return this.formatHours(api);
    return this.formatHours(this.todayAttendance?.totalHours || '00:00:00');
  }

  private loadMonthOverview() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // 1-12
    
    // Use the same API as employee attendance component
    this.employeeService.getSelfCombinedAttendance(year, month).subscribe({
      next: (response) => {
        console.log('Combined attendance data loaded:', response);
        // Store combined data for daily summary
        this.combinedAttendanceData = response;
        this.dailySummaryRecords = this.transformCombinedDataToRecords(response);
        this.calculateMonthlyStatsFromCombined(response);
        this.initializeCharts();
      },
      error: (err) => {
        console.error('Combined attendance API error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Monthly Overview Error',
          detail: 'Failed to load month overview. Please try again.',
          life: 3000
        });
        
        // Fallback: Try to use recent attendance data for hours chart
        this.initializeFallbackCharts();
      }
    });
  }


  getStatusColor(record: AttendanceRecord): string {
    if (!record.sessionStart && !record.sessionEnd) return 'danger'; // absent
    if (record.sessionStart && this.isLate(record.sessionStart)) return 'warning'; // late
    if (record.sessionStart && record.sessionEnd) return 'success'; // present
    return 'info'; // partial
  }

  getStatusIcon(record: AttendanceRecord): string {
    if (!record.sessionStart && !record.sessionEnd) return 'pi pi-times-circle';
    if (record.sessionStart && this.isLate(record.sessionStart)) return 'pi pi-clock';
    if (record.sessionStart && record.sessionEnd) return 'pi pi-check-circle';
    return 'pi pi-minus-circle';
  }

  getStatusText(record: AttendanceRecord): string {
    if (!record.sessionStart && !record.sessionEnd) return 'Absent';
    if (record.sessionStart && this.isLate(record.sessionStart)) return 'Late';
    if (record.sessionStart && record.sessionEnd) return 'Present';
    return 'Partial';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    // Treat provided date as UTC if no timezone is included
    const utcString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const d = new Date(utcString);
    if (isNaN(d.getTime())) return '-';
    // Convert UTC to local timezone for display
    return d.toLocaleDateString('en-US', {
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  formatTime(timeString: string | null | undefined): string {
    if (!timeString) return '-';
    // If it's already in HH:MM AM/PM format, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    // If it's in ISO format or other format, try to parse and format
    try {
      const utcString = timeString.endsWith('Z') ? timeString : `${timeString}Z`;
      const date = new Date(utcString);
      // Session End formatting rule: "Running" if null handled by caller
      return date.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return timeString; // Return original if parsing fails
    }
  }

  formatHours(hours: string): string {
    if (!hours || hours === '0' || hours === '00:00:00') return '0s';
    // If in HH:MM:SS → humanize to "Xh, Ym, Zs"
    if (hours.includes(':')) {
      return this.humanizeHms(hours);
    }
    // Otherwise treat as decimal hours string → convert to h/m/s
    const dec = Number(hours);
    if (isNaN(dec) || dec <= 0) return '0s';
    const totalSeconds = Math.round(dec * 3600);
    return this.humanizeSeconds(totalSeconds);
  }

  private formatTimeSpan(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private humanizeHms(hms: string): string {
    const parts = hms.split(':');
    if (parts.length < 3) return hms;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = Math.round(parseFloat(parts[2])) || 0;
    const out: string[] = [];
    if (h > 0) out.push(`${h}h`);
    if (m > 0) out.push(`${m}m`);
    if (s > 0 || out.length === 0) out.push(`${s}s`);
    return out.join(', ');
  }

  private humanizeSeconds(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const out: string[] = [];
    if (h > 0) out.push(`${h}h`);
    if (m > 0) out.push(`${m}m`);
    if (s > 0 || out.length === 0) out.push(`${s}s`);
    return out.join(', ');
  }

  // Welcome popup methods
  private checkWelcomePopup(): void {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcomePopup');
    if (!hasSeenWelcome) {
      // Load user data for popup
      const punchInData = localStorage.getItem('punchInUser');
      if (punchInData) {
        try {
          this.welcomeUserData = JSON.parse(punchInData);
        } catch (error) {
          console.error('Error parsing punch in user data:', error);
          // Set default user data if parsing fails
          this.welcomeUserData = {
            name: this.user?.name || 'Employee',
            employeeId: this.user?.employeeId || 'N/A',
            punchedTime: new Date().toLocaleString(),
            location: 'Office'
          };
        }
      } else {
        // Set default user data if no punch in data
        this.welcomeUserData = {
          name: this.user?.name || 'Employee',
          employeeId: this.user?.employeeId || 'N/A',
          punchedTime: new Date().toLocaleString(),
          location: 'Office'
        };
      }
      this.showWelcomePopup = true;
    }
  }

  onWelcomePopupClose(): void {
    this.showWelcomePopup = false;
    // Mark that user has seen the welcome popup
    localStorage.setItem('hasSeenWelcomePopup', 'true');
  }

  // Method to reset welcome popup for testing (can be removed in production)
  resetWelcomePopup(): void {
    localStorage.removeItem('hasSeenWelcomePopup');
    this.checkWelcomePopup();
  }

}