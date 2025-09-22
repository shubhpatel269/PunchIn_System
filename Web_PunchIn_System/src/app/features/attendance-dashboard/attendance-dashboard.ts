import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  templateUrl: './attendance-dashboard.html',
  styleUrls: ['./attendance-dashboard.css'],
  imports: [CommonModule]
})
export class AttendanceDashboardComponent implements OnInit {
  currentDate: Date = new Date();

  // Dashboard stats
  totalPunchIns = 0;
  activeSessions = 0;
  employeesOnBreak = 0;
  attendanceRate = 0;
  totalEmployees = 0;

  ngOnInit() {
    // TODO: Load initial data from API
  }
}
