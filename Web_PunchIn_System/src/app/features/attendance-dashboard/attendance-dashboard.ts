import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ✅ PrimeNG v20 Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';


interface Employee {
  id: string;
  name: string;
  designation: string;
  punchInTime: Date;
  status: 'active' | 'paused' | 'completed';
  sessionDuration: string;
  breakCount: number;
  breakDuration: string;
  location: string;
}

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  templateUrl: './attendance-dashboard.html',
  styleUrls: ['./attendance-dashboard.css'],
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    SelectModule,
    TableModule,
    ChartModule,
    DatePickerModule,
    TabsModule
  ]
})
export class AttendanceDashboardComponent implements OnInit {
  currentDate: Date = new Date();
  selectedDate: Date = new Date();
  dateRange: Date[] = [];
  companies: any[] = [
    { name: 'Company A', code: 'A' },
    { name: 'Company B', code: 'B' }
  ];
  selectedCompany: any;
  activeTabIndex = 0;

  // Sample stats
  totalPunchIns = 0;
  activeSessions = 0;
  employeesOnBreak = 0;
  attendanceRate = 0;

  employees: Employee[] = [];
  statuses = ['All', 'Present', 'Absent', 'Completed'];

  // Chart data
  hourlyData: any;
  departmentData: any;
  sessionDurationData: any;
  breakPatternData: any;

  ngOnInit() {
    this.initializeCharts();
    // TODO: Load initial data from API
  }

  initializeCharts() {
    // Hourly punch-ins
    this.hourlyData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Punch-ins',
        data: Array(24).fill(0).map(() => Math.floor(Math.random() * 50)),
        borderColor: '#42A5F5',
        fill: false
      }]
    };

    // Department breakdown
    this.departmentData = {
      labels: ['Development', 'Design', 'Marketing', 'HR', 'Sales'],
      datasets: [{
        label: 'Attendance Rate %',
        backgroundColor: '#42A5F5',
        data: [85, 90, 78, 92, 88]
      }]
    };

    // Session duration
    this.sessionDurationData = {
      labels: ['<1h', '1-2h', '2-4h', '4-6h', '6h+'],
      datasets: [{
        label: 'Employees',
        backgroundColor: '#42A5F5',
        data: [5, 12, 28, 35, 20]
      }]
    };

    // Break patterns
    this.breakPatternData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Break Duration (avg min)',
        data: Array(24).fill(0).map(() => Math.floor(Math.random() * 30)),
        borderColor: '#FFA726',
        fill: false
      }]
    };
  }

  // ---------------- Date Helpers ----------------
  getToday(): Date[] {
    const today = new Date();
    return [today, today];
  }

  getYesterday(): Date[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return [yesterday, yesterday];
  }

  onDateSelect(event: any) {
    if (event) {
      if (Array.isArray(event)) {
        this.dateRange = event;
      } else if (event instanceof Date) {
        this.dateRange = [event, event];
      }
      console.log("Selected date range:", this.dateRange);
    }
  }

  onCompanyChange(event: any) {
    this.selectedCompany = event.value;
    console.log('Selected company:', this.selectedCompany);
  }
  
  exportToExcel() {
    console.log('Exporting to Excel...');
    // TODO: Implement export to Excel functionality
  }

  exportReport(format: 'pdf' | 'excel') {
    console.log(`Exporting report as ${format}`);
  }

  notifyHR() {
    console.log('Notifying HR...');
  }
}
