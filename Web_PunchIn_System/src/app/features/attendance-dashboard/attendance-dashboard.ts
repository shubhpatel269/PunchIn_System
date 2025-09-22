import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  templateUrl: './attendance-dashboard.html',
  styleUrls: ['./attendance-dashboard.css'],
  imports: [CommonModule, CardModule, AvatarModule, TagModule]
})
export class AttendanceDashboardComponent implements OnInit {
  currentDate: Date = new Date();

  // Dashboard stats
  totalPunchIns = 0;
  activeSessions = 0;
  employeesOnBreak = 0;
  attendanceRate = 0;
  totalEmployees = 0;
  recentAttendance: any[] = [];

  ngOnInit() {
    this.loadRecentAttendance();
    // TODO: Load initial data from API
  }

  loadRecentAttendance() {
    // Mock data for recent attendance - you can replace this with actual API call
    this.recentAttendance = [
      {
        employeeName: 'John Doe',
        date: new Date(),
        sessionStart: '09:00:00',
        sessionEnd: '17:30:00',
        totalHours: '08:30:00',
        status: 'present'
      },
      {
        employeeName: 'Jane Smith',
        date: new Date(Date.now() - 86400000),
        sessionStart: '09:15:00',
        sessionEnd: '18:00:00',
        totalHours: '08:45:00',
        status: 'late'
      },
      {
        employeeName: 'Mike Johnson',
        date: new Date(Date.now() - 172800000),
        sessionStart: '08:45:00',
        sessionEnd: '17:15:00',
        totalHours: '08:30:00',
        status: 'present'
      },
      {
        employeeName: 'Sarah Wilson',
        date: new Date(Date.now() - 259200000),
        sessionStart: null,
        sessionEnd: null,
        totalHours: '00:00:00',
        status: 'absent'
      },
      {
        employeeName: 'David Brown',
        date: new Date(Date.now() - 345600000),
        sessionStart: '09:30:00',
        sessionEnd: '16:30:00',
        totalHours: '07:00:00',
        status: 'half-day'
      }
    ];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(time: string | null): string {
    if (!time) return '-';
    return time;
  }

  formatHours(hours: string): string {
    return hours || '00:00:00';
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
      case 'present': return 'pi pi-check';
      case 'absent': return 'pi pi-times';
      case 'late': return 'pi pi-clock';
      case 'half-day': return 'pi pi-minus';
      default: return 'pi pi-question';
    }
  }
}
