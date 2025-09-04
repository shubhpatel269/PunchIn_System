import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { DividerModule } from 'primeng/divider';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../shared/services/auth.service';

interface AttendanceRecord {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
  totalHours: number;
  averageHours: number;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    BadgeModule,
    ProgressBarModule,
    ChartModule,
    DividerModule,
    AvatarModule,
    TagModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css'
})
export class EmployeeDashboardComponent implements OnInit {
  user: any = null;
  currentTime: string = '';
  todayAttendance: AttendanceRecord | null = null;
  attendanceStats: AttendanceStats = {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    attendancePercentage: 0,
    totalHours: 0,
    averageHours: 0
  };
  
  // Chart data
  attendanceChartData: any;
  hoursChartData: any;
  chartOptions: any;

  // Mock data for demonstration
  recentAttendance: AttendanceRecord[] = [
    { date: '2024-01-15', punchIn: '09:00 AM', punchOut: '06:00 PM', totalHours: 8, status: 'present' },
    { date: '2024-01-14', punchIn: '09:15 AM', punchOut: '05:45 PM', totalHours: 7.5, status: 'late' },
    { date: '2024-01-13', punchIn: '08:45 AM', punchOut: '06:15 PM', totalHours: 8.5, status: 'present' },
    { date: '2024-01-12', punchIn: '09:00 AM', punchOut: '05:30 PM', totalHours: 7.5, status: 'present' },
    { date: '2024-01-11', punchIn: null, punchOut: null, totalHours: 0, status: 'absent' }
  ];

  constructor(
    private router: Router,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTodayAttendance();
    this.loadAttendanceStats();
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
          punchIn: punchInTime,
          punchOut: null,
          totalHours: 0,
          status: 'present'
        };
      }
    }
  }

  loadAttendanceStats() {
    // Calculate stats from recent attendance
    const totalDays = this.recentAttendance.length;
    const presentDays = this.recentAttendance.filter(r => r.status === 'present' || r.status === 'late').length;
    const absentDays = this.recentAttendance.filter(r => r.status === 'absent').length;
    const lateDays = this.recentAttendance.filter(r => r.status === 'late').length;
    const totalHours = this.recentAttendance.reduce((sum, r) => sum + r.totalHours, 0);

    this.attendanceStats = {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      totalHours,
      averageHours: totalDays > 0 ? totalHours / totalDays : 0
    };
  }

  initializeCharts() {
    // Attendance chart data
    this.attendanceChartData = {
      labels: ['Present', 'Absent', 'Late'],
      datasets: [{
        data: [this.attendanceStats.presentDays, this.attendanceStats.absentDays, this.attendanceStats.lateDays],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
        borderWidth: 0
      }]
    };

    // Hours chart data (last 7 days)
    const last7Days = this.recentAttendance.slice(0, 7).reverse();
    this.hoursChartData = {
      labels: last7Days.map(record => {
        const date = new Date(record.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Hours Worked',
        data: last7Days.map(record => record.totalHours),
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
          max: 10
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
    if (!this.todayAttendance?.punchIn) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Punch In',
        detail: 'You need to punch in first before punching out.',
        life: 3000
      });
      return;
    }

    if (this.todayAttendance.punchOut) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Already Punched Out',
        detail: 'You have already punched out for today.',
        life: 3000
      });
      return;
    }

    const punchOutTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit'
    });

    this.todayAttendance.punchOut = punchOutTime;
    
    // Calculate total hours
    const punchInTime = new Date(`2000-01-01 ${this.todayAttendance.punchIn}`);
    const punchOutTimeDate = new Date(`2000-01-01 ${punchOutTime}`);
    const diffMs = punchOutTimeDate.getTime() - punchInTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    this.todayAttendance.totalHours = Math.round(diffHours * 10) / 10;

    this.messageService.add({
      severity: 'success',
      summary: 'Punch Out Successful',
      detail: `You punched out at ${punchOutTime}. Total hours: ${this.todayAttendance.totalHours}`,
      life: 4000
    });

    // Save to localStorage
    localStorage.setItem('todayPunchOut', punchOutTime);
  }

  takeBreak() {
    this.messageService.add({
      severity: 'info',
      summary: 'Break Started',
      detail: 'Your break has been recorded. Remember to return on time!',
      life: 3000
    });
  }

  viewAttendance() {
    this.router.navigate(['/employee/attendance']);
  }

  viewProfile() {
    this.router.navigate(['/employee/profile']);
  }



  getStatusColor(status: string): string {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'half-day': return 'info';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'present': return 'pi pi-check-circle';
      case 'absent': return 'pi pi-times-circle';
      case 'late': return 'pi pi-clock';
      case 'half-day': return 'pi pi-minus-circle';
      default: return 'pi pi-question-circle';
    }
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
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}