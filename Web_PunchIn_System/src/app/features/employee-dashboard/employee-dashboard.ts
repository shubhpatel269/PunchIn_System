import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  // Recent attendance data from API
  recentAttendance: AttendanceRecord[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private authService: AuthService,
    private sessionService: SessionService,
    private breakService: BreakService,
    private attendanceService: AttendanceService
  ) {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit() {
    this.loadUserData();
    this.loadTodayAttendance();
    this.loadRecentAttendance();
    this.loadAttendanceStats();
    this.initializeCharts();

    // Restore break state from storage or URL
    this.restoreBreakState();
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
          this.loadAttendanceStats();
          this.initializeCharts();
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

  private parseHours(timeString: string): number {
    if (!timeString) return 0;
    // Parse HH:MM:SS format to decimal hours
    const parts = timeString.split(':');
    if (parts.length >= 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      return hours + (minutes / 60) + (seconds / 3600);
    }
    return 0;
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
    const totalHours = this.todayAttendance ? this.formatHours(this.todayAttendance.totalHours) : '0h';

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
    return new Date(dateString).toLocaleDateString('en-US', { 
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
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour12: true, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return timeString; // Return original if parsing fails
    }
  }

  formatHours(hours: string): string {
    if (!hours || hours === '0' || hours === '00:00:00') return '0h';
    // If it's already in HH:MM:SS format, convert to decimal hours
    const decimalHours = this.parseHours(hours);
    if (decimalHours < 1) {
      return `${Math.round(decimalHours * 100) / 100}h`;
    }
    return `${Math.round(decimalHours * 10) / 10}h`;
  }

  private formatTimeSpan(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}