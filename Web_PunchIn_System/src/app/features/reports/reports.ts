import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DashboardData {
  totalWorkingHours: number;
  averageSessionDuration: string;
  totalBreakDuration: number;
  overtimeHours: number;
  lateArrivals: number;
  earlyExits: number;
  hourlyPunchData: { hour: number; count: number }[];
  leaveTypeData: { type: string; percentage: number; color: string }[];
  leaveTrendData: { month: string; count: number }[];
  dailyWorkingHoursData: { month: string; hours: number }[];
  weeklyAttendanceData: { day: string; hours: number }[];
  sessionDurationData: { day: string; duration: number }[];
  teamComparisonData: {
    employeeBreaks: number;
    teamAverageBreaks: number;
    employeeBreakDuration: number;
    teamBreakDuration: number;
  };
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
  selectedEmployee: string = 'All Employees';
  selectedTimeframe: string = 'Month';
  customDateRange: { start: string; end: string } = { start: '', end: '' };

  // Precomputed chart points
  leaveTrendPoints = '';
  dailyWorkingHoursPoints = '';
  weeklyAttendancePoints = '';
  sessionDurationPoints = '';

  dashboardData: DashboardData = {
    totalWorkingHours: 160,
    averageSessionDuration: '08:33',
    totalBreakDuration: 10,
    overtimeHours: 12,
    lateArrivals: 4,
    earlyExits: 6,
    hourlyPunchData: [
      { hour: 6, count: 2 },
      { hour: 7, count: 3 },
      { hour: 8, count: 5 },
      { hour: 9, count: 0 },
      { hour: 10, count: 7 },
      { hour: 11, count: 20 },
      { hour: 12, count: 6 },
      { hour: 13, count: 20 },
      { hour: 14, count: 12 },
      { hour: 15, count: 8 },
      { hour: 16, count: 7 },
      { hour: 17, count: 6 },
      { hour: 18, count: 4 },
      { hour: 19, count: 2 },
      { hour: 20, count: 1 }
    ],
    leaveTypeData: [
      { type: 'Casual', percentage: 15, color: '#3B82F6' },
      { type: 'Sick', percentage: 50, color: '#10B981' },
      { type: 'Vacation', percentage: 35, color: '#F59E0B' }
    ],
    leaveTrendData: [
      { month: 'Jan', count: 6 },
      { month: 'Feb', count: 5 },
      { month: 'Mar', count: 7 },
      { month: 'Apr', count: 8 },
      { month: 'May', count: 8 },
      { month: 'Jun', count: 6 },
      { month: 'Jul', count: 7 },
      { month: 'Aug', count: 6 },
      { month: 'Sep', count: 7 },
      { month: 'Oct', count: 8 },
      { month: 'Nov', count: 7 },
      { month: 'Dec', count: 9 }
    ],
    dailyWorkingHoursData: [
      { month: 'Jan', hours: 5 },
      { month: 'Feb', hours: 7 },
      { month: 'Mar', hours: 10 },
      { month: 'Apr', hours: 9 },
      { month: 'May', hours: 11 },
      { month: 'Jun', hours: 7 },
      { month: 'Jul', hours: 8 },
      { month: 'Aug', hours: 10 },
      { month: 'Sep', hours: 9 },
      { month: 'Oct', hours: 7 },
      { month: 'Nov', hours: 8 },
      { month: 'Dec', hours: 9 }
    ],
    weeklyAttendanceData: [
      { day: 'M', hours: 40 },
      { day: 'T', hours: 50 },
      { day: 'W', hours: 60 },
      { day: 'T', hours: 70 },
      { day: 'F', hours: 80 },
      { day: 'S', hours: 35 },
      { day: 'S', hours: 30 }
    ],
    sessionDurationData: [
      { day: 'M', duration: 15 },
      { day: 'T', duration: 25 },
      { day: 'W', duration: 22 },
      { day: 'T', duration: 18 },
      { day: 'F', duration: 20 },
      { day: 'S', duration: 12 },
      { day: 'S', duration: 10 }
    ],
    teamComparisonData: {

      employeeBreaks: 65,
      teamAverageBreaks: 55,
      employeeBreakDuration: 55,
      teamBreakDuration: 75
    }
  };

  employees = ['All Employees', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'];
  timeframes = ['Day', 'Week', 'Month', 'Custom'];

  ngOnInit() {
    this.leaveTrendPoints = this.getPoints(
      this.dashboardData.leaveTrendData,
      30,
      item => 180 - (item.count - 4) * 15
    );
    this.dailyWorkingHoursPoints = this.getPoints(
      this.dashboardData.dailyWorkingHoursData,
      30,
      item => 180 - (item.hours - 5) * 15
    );
    this.weeklyAttendancePoints = this.getPoints(
      this.dashboardData.weeklyAttendanceData,
      50,
      item => 180 - (item.hours - 30) * 2
    );
    this.sessionDurationPoints = this.getPoints(
      this.dashboardData.sessionDurationData,
      50,
      item => 180 - (item.duration - 10) * 8
    );
  }

  getPoints(data: any[], step: number, yFn: (item: any) => number): string {
    return data.map((item, index) => `${index * step + 20},${yFn(item)}`).join(' ');
  }

  getMaxValue(data: any[], key: string): number {
    return Math.max(...data.map(item => item[key]));
  }

  onEmployeeChange() {
    console.log('Employee changed to:', this.selectedEmployee);
  }

  onTimeframeChange() {
    console.log('Timeframe changed to:', this.selectedTimeframe);
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
  }
}
