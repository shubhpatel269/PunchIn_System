import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';

interface RecentSession {
  punchId: number;
  employeeId: string;
  employeeName: string;
  punchTimestamp: string;
  punchLocationLong: number;
  punchLocationLat: number;
  sessionId: number;
  sessionStatus: string;
  sessionStartTime: string;
  sessionEndTime: string | null;
  sessionDuration: string | null;
  totalBreakDuration: string;
}

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  templateUrl: './attendance-dashboard.html',
  styleUrls: ['./attendance-dashboard.css'],
  imports: [CommonModule, CardModule, TagModule, ToastModule],
  providers: [MessageService]
})
export class AttendanceDashboardComponent implements OnInit {
  currentDate: Date = new Date();
  userTimezone: string = '';

  // Dashboard stats
  totalPunchIns = 0;
  activeSessions = 0;
  employeesOnBreak = 0;
  attendanceRate = 0;
  totalEmployees = 0;
  recentAttendance: RecentSession[] = [];
  loadingRecentAttendance = false;

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadRecentAttendance();
    // TODO: Load initial data from API
    this.initializeTimezone();
  }

  initializeTimezone() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.userTimezone = timezone;
  }

  loadRecentAttendance() {
    this.loadingRecentAttendance = true;
    
    this.http.get<RecentSession[]>('https://localhost:7127/api/Attendance/Admin/RecentSessions').subscribe({
      next: (data) => {
        this.recentAttendance = data || [];
        this.loadingRecentAttendance = false;
      },
      error: (error) => {
        this.loadingRecentAttendance = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load recent attendance data',
          life: 3000
        });
        
        // Fallback to empty array on error
        this.recentAttendance = [];
      }
    });
  }

  formatDate(date: Date | string): string {
    if (!date) return '-';
    
    let dateObj: Date;
    if (typeof date === 'string') {
      // If the string doesn't end with 'Z', treat it as UTC by appending 'Z'
      const utcString = date.endsWith('Z') ? date : date + 'Z';
      dateObj = new Date(utcString);
    } else {
      dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
    
    // Convert UTC to local timezone
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(time: string | null): string {
    if (!time) return '-';
    
    // If it's a full timestamp, extract just the time part
    if (time.includes('T')) {
      // If the string doesn't end with 'Z', treat it as UTC by appending 'Z'
      const utcString = time.endsWith('Z') ? time : time + 'Z';
      const date = new Date(utcString);
      // Convert UTC to local timezone
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
    
    return time;
  }

  formatDuration(duration: string | null): string {
    if (!duration) return '00:00:00';
    return duration;
  }

  formatDynamicDuration(duration: string | null, startTime: string, endTime: string | null): string {
    // If we have a duration from API, use it
    if (duration && duration !== '00:00:00') {
      return this.formatDurationToReadable(duration);
    }
    
    // If no end time (active session), calculate from start time to now
    if (!endTime && startTime) {
      // Treat startTime as UTC if it doesn't have 'Z' suffix
      const startUTCString = startTime.endsWith('Z') ? startTime : startTime + 'Z';
      const start = new Date(startUTCString);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      
      // Only show positive duration (avoid negative values due to timezone issues)
      if (diffMs > 0) {
        return this.formatMsToReadable(diffMs);
      } else {
        return '0s';
      }
    }
    
    // If we have both start and end times, calculate duration
    if (startTime && endTime) {
      // Treat both times as UTC if they don't have 'Z' suffix
      const startUTCString = startTime.endsWith('Z') ? startTime : startTime + 'Z';
      const endUTCString = endTime.endsWith('Z') ? endTime : endTime + 'Z';
      const start = new Date(startUTCString);
      const end = new Date(endUTCString);
      const diffMs = end.getTime() - start.getTime();
      
      // Only show positive duration
      if (diffMs > 0) {
        return this.formatMsToReadable(diffMs);
      } else {
        return '0s';
      }
    }
    
    return '0s';
  }

  formatDurationToReadable(duration: string): string {
    // Parse HH:MM:SS format
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      
      return this.formatTimeComponents(hours, minutes, seconds);
    }
    return duration;
  }

  formatMsToReadable(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return this.formatTimeComponents(hours, minutes, seconds);
  }

  formatTimeComponents(hours: number, minutes: number, seconds: number): string {
    const parts: string[] = [];
    
    if (hours > 0) {
      parts.push(`${hours}hr`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}min`);
    }
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`);
    }
    
    return parts.join(', ');
  }

  getSessionStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'on_break': return 'On Break';
      default: return status || 'Unknown';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'on_break': return 'warning';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'pi pi-check-circle';
      case 'completed': return 'pi pi-check';
      case 'on_break': return 'pi pi-clock';
      default: return 'pi pi-question';
    }
  }
}
