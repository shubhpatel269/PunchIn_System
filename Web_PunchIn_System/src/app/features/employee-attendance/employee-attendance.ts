import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
    private messageService: MessageService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit() {
    this.loadUserData();
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

    // Calculate date range for the selected month
    const startDate = new Date(this.selectedYear, this.selectedMonth, 1);
    const endDate = new Date(this.selectedYear, this.selectedMonth + 1, 0);

    this.attendanceService.getAttendanceSummary(this.user.employeeId, startDate, endDate)
      .subscribe({
        next: (response) => {
          this.attendanceRecords = this.transformApiDataToRecords(response.records);
          this.filteredRecords = [...this.attendanceRecords];
          this.calculateMonthlyStats();
          this.initializeCharts();
        },
        error: (error) => {
          console.error('Error loading attendance data:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load attendance data',
            life: 3000
          });
          // Fallback to empty data
          this.attendanceRecords = [];
          this.filteredRecords = [];
          this.calculateMonthlyStats();
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
        
        allRecords.push({
          date: record.date,
          day: record.day,
          punchIn: this.formatTime(session.sessionStartTime),
          punchOut: session.sessionEndTime ? this.formatTime(session.sessionEndTime) : null,
          totalHours: Math.round(sessionHours * 100) / 100,
          totalHoursFormatted: this.formatWorkTime(sessionHours),
          status,
          overtime: sessionHours > 8 ? Math.round((sessionHours - 8) * 100) / 100 : 0,
          breakCount: session.breakCount || 0,
          totalBreak: Math.round(sessionBreakHours * 100) / 100,
          totalBreakFormatted: this.formatBreakTime(sessionBreakHours),
          sessionId: session.sessionId,
          punchId: session.punchId,
          sessionStatus: session.sessionStatus,
          isFirstSession,
          isLastSession
        });
      });
    });
    
    return allRecords;
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

  private formatTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private formatBreakTime(hours: number): string {
    if (hours === 0) {
      return '-';
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

  private formatWorkTime(hours: number): string {
    if (hours === 0) {
      return '0h';
    }
    
    // For work time, always show hours with decimal places for precision
    return `${Math.round(hours * 100) / 100}h`;
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
    this.hoursChartData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
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
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 50
        }
      }
    };
  }

  getWeeklyHoursData(): number[] {
    const weeks = [0, 0, 0, 0, 0];
    this.attendanceRecords.forEach(record => {
      const day = new Date(record.date).getDate();
      const weekIndex = Math.floor((day - 1) / 7);
      if (weekIndex < 5) {
        weeks[weekIndex] += record.totalHours;
      }
    });
    return weeks;
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
    this.router.navigate(['/employee/dashboard']);
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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}