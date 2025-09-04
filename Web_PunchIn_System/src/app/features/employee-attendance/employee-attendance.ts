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

interface AttendanceRecord {
  date: string;
  day: string;
  punchIn: string | null;
  punchOut: string | null;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'holiday';
  overtime: number;
  breaks: number;
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
    private messageService: MessageService
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
    // Mock attendance data for the selected month
    this.attendanceRecords = this.generateMockAttendanceData();
    this.filteredRecords = [...this.attendanceRecords];
    this.calculateMonthlyStats();
  }

  generateMockAttendanceData(): AttendanceRecord[] {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const records: AttendanceRecord[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        records.push({
          date: date.toISOString().split('T')[0],
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          punchIn: null,
          punchOut: null,
          totalHours: 0,
          status: 'holiday',
          overtime: 0,
          breaks: 0
        });
        continue;
      }

      // Generate random attendance data for weekdays
      const isPresent = Math.random() > 0.1; // 90% attendance rate
      const isLate = isPresent && Math.random() > 0.8; // 20% late rate
      const isHalfDay = isPresent && Math.random() > 0.95; // 5% half day rate

      let status: AttendanceRecord['status'] = 'absent';
      let punchIn: string | null = null;
      let punchOut: string | null = null;
      let totalHours = 0;
      let overtime = 0;

      if (isPresent) {
        if (isHalfDay) {
          status = 'half-day';
          punchIn = '09:00 AM';
          punchOut = '01:00 PM';
          totalHours = 4;
        } else if (isLate) {
          status = 'late';
          punchIn = '09:30 AM';
          punchOut = '06:30 PM';
          totalHours = 8;
          overtime = 0.5;
        } else {
          status = 'present';
          punchIn = '09:00 AM';
          punchOut = '06:00 PM';
          totalHours = 8;
        }
      }

      records.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        punchIn,
        punchOut,
        totalHours,
        status,
        overtime,
        breaks: isPresent ? Math.floor(Math.random() * 3) : 0
      });
    }

    return records;
  }

  calculateMonthlyStats() {
    const workingDays = this.attendanceRecords.filter(r => r.status !== 'holiday').length;
    const presentDays = this.attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = this.attendanceRecords.filter(r => r.status === 'absent').length;
    const lateDays = this.attendanceRecords.filter(r => r.status === 'late').length;
    const halfDays = this.attendanceRecords.filter(r => r.status === 'half-day').length;
    const holidays = this.attendanceRecords.filter(r => r.status === 'holiday').length;
    const totalHours = this.attendanceRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const overtimeHours = this.attendanceRecords.reduce((sum, r) => sum + r.overtime, 0);

    this.monthlyStats = {
      totalDays: this.attendanceRecords.length,
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