import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ActivityLogService, ActivityLog, ActivityLogSummary } from '../../shared/services/activity-log.service';
import { AttendanceService } from '../../shared/services/attendance.service';

interface ActivityLogWithDisplay extends ActivityLog {
  formattedTimestamp: string;
  formattedDuration: string;
  activityTypeDisplay: string;
  activityTypeColor: string;
}

interface ActivitySummaryWithDisplay extends ActivityLogSummary {
  formattedDuration: string;
  formattedFirstActivity: string;
  formattedLastActivity: string;
  percentage: number;
}

@Component({
  selector: 'app-employee-activity-log',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    SkeletonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './employee-activity-log.html',
  styleUrls: ['./employee-activity-log.css']
})
export class EmployeeActivityLogComponent implements OnInit, OnDestroy {
  sessionId: number | null = null;
  employeeId: string | null = null;
  employeeName: string = 'Employee';
  sessionStartTime: string | null = null;
  sessionEndTime: string | null = null;
  
  // Data
  activityLogs: ActivityLogWithDisplay[] = [];
  activitySummary: ActivitySummaryWithDisplay[] = [];
  
  // Loading states
  isLoadingLogs: boolean = true;
  isLoadingSummary: boolean = true;
  
  
  // Filter options
  selectedTabIndex: number = 0;
  
  // Statistics
  totalSessionTime: number = 0;
  totalActiveTime: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    public activityLogService: ActivityLogService,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.sessionId = params['sessionId'] ? +params['sessionId'] : null;
      this.employeeId = params['employeeId'] || null;
      
      if (this.sessionId && this.employeeId) {
        this.employeeName = `Employee ${this.employeeId}`; // This could be enhanced to fetch actual employee name
        this.loadSessionData();
        this.loadActivityData();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Session ID or Employee ID not provided',
          life: 3000
        });
        this.goBack();
      }
    });
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  loadSessionData() {
    // Load session details if needed
    // For now, we'll use the sessionId directly
  }

  loadActivityData() {
    if (!this.sessionId) return;

    // Load activity logs
    this.isLoadingLogs = true;
    this.isLoadingSummary = true;
    
    this.activityLogService.getActivityLogsBySession(this.sessionId).subscribe({
      next: (logs) => {
        console.log(`[ActivityLog] Loaded ${logs.length} activity logs from API`);
        
        // Calculate actual durations based on timestamps since agent logs DurationSeconds as 0
        const logsWithCalculatedDurations = this.calculateActivityDurations(logs);
        
        this.activityLogs = logsWithCalculatedDurations.map(log => ({
          ...log,
          formattedTimestamp: this.activityLogService.formatTimestamp(log.activityTimestamp),
          formattedDuration: log.durationSeconds ? this.activityLogService.formatDuration(log.durationSeconds) : '-',
          activityTypeDisplay: this.activityLogService.getActivityTypeDisplayName(log.activityType),
          activityTypeColor: this.activityLogService.getActivityTypeColor(log.activityType)
        }));
        
        console.log(`[ActivityLog] Processed ${this.activityLogs.length} activity logs`);
        
        // Calculate summary from the processed logs
        this.calculateSummaryFromLogs();
        
        this.isLoadingLogs = false;
        this.isLoadingSummary = false;
      },
      error: (error) => {
        console.error('Error loading activity logs:', error);
        this.isLoadingLogs = false;
        this.isLoadingSummary = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load activity logs',
          life: 3000
        });
      }
    });
  }

  /**
   * Calculate actual durations for activity logs based on timestamps
   * Since the agent logs DurationSeconds as 0, we need to calculate it from timestamps
   */
  private calculateActivityDurations(logs: ActivityLog[]): ActivityLog[] {
    if (logs.length === 0) return logs;

    console.log(`[ActivityLog] Calculating durations for ${logs.length} activity logs`);

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.activityTimestamp).getTime() - new Date(b.activityTimestamp).getTime()
    );

    const logsWithDurations: ActivityLog[] = [];

    for (let i = 0; i < sortedLogs.length; i++) {
      const currentLog = { ...sortedLogs[i] };
      
      // For the last log, we can't calculate duration (no next activity)
      if (i === sortedLogs.length - 1) {
        // For the last activity, assume it lasted until the end of session or 5 minutes
        currentLog.durationSeconds = 300; // 5 minutes default
        console.log(`[ActivityLog] Last activity: ${currentLog.applicationName} - Default duration: 5 minutes`);
      } else {
        const nextLog = sortedLogs[i + 1];
        const currentTime = new Date(currentLog.activityTimestamp).getTime();
        const nextTime = new Date(nextLog.activityTimestamp).getTime();
        
        // Calculate duration in seconds
        const durationSeconds = Math.floor((nextTime - currentTime) / 1000);
        
        // Cap duration at reasonable limits (max 1 hour per activity)
        currentLog.durationSeconds = Math.min(Math.max(durationSeconds, 1), 3600);
        
        console.log(`[ActivityLog] ${currentLog.applicationName}: ${durationSeconds}s (capped: ${currentLog.durationSeconds}s)`);
      }
      
      logsWithDurations.push(currentLog);
    }

    const totalCalculatedTime = logsWithDurations.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
    console.log(`[ActivityLog] Total calculated time: ${totalCalculatedTime} seconds (${Math.round(totalCalculatedTime / 60)} minutes)`);

    return logsWithDurations;
  }

  /**
   * Calculate activity summary from raw logs since API summary uses DurationSeconds = 0
   */
  private calculateSummaryFromLogs() {
    console.log(`[ActivityLog] calculateSummaryFromLogs called with ${this.activityLogs.length} logs`);
    
    if (this.activityLogs.length === 0) {
      console.log('[ActivityLog] No activity logs available for summary calculation');
      this.activitySummary = [];
      this.totalActiveTime = 0;
      return;
    }

    // Group logs by application name
    const appGroups = new Map<string, ActivityLog[]>();
    
    this.activityLogs.forEach(log => {
      if (!appGroups.has(log.applicationName)) {
        appGroups.set(log.applicationName, []);
      }
      appGroups.get(log.applicationName)!.push(log);
    });

    console.log(`[ActivityLog] Grouped logs into ${appGroups.size} applications:`, Array.from(appGroups.keys()));

    // Calculate summary for each application
    this.activitySummary = Array.from(appGroups.entries()).map(([appName, logs]) => {
      const totalDuration = logs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
      const sortedLogs = logs.sort((a, b) => 
        new Date(a.activityTimestamp).getTime() - new Date(b.activityTimestamp).getTime()
      );
      
      console.log(`[ActivityLog] ${appName}: ${logs.length} logs, total duration: ${totalDuration}s`);
      
      return {
        applicationName: appName,
        processName: logs[0]?.processName || '',
        totalDurationSeconds: totalDuration,
        activityCount: logs.length,
        firstActivity: sortedLogs[0].activityTimestamp,
        lastActivity: sortedLogs[sortedLogs.length - 1].activityTimestamp,
        isCurrentlyActive: logs.some(log => 
          new Date(log.activityTimestamp).getTime() > (Date.now() - 5 * 60 * 1000) // Active within last 5 minutes
        ),
        formattedDuration: this.activityLogService.formatDuration(totalDuration),
        formattedFirstActivity: this.activityLogService.formatTimestamp(sortedLogs[0].activityTimestamp),
        formattedLastActivity: this.activityLogService.formatTimestamp(sortedLogs[sortedLogs.length - 1].activityTimestamp),
        percentage: 0 // Will be calculated after totalActiveTime
      };
    });

    // Calculate total active time and percentages
    this.totalActiveTime = this.activitySummary.reduce((total, item) => total + item.totalDurationSeconds, 0);
    
    console.log(`[ActivityLog] Total active time calculated: ${this.totalActiveTime}s`);
    
    this.activitySummary = this.activitySummary.map(item => ({
      ...item,
      percentage: this.totalActiveTime > 0 ? (item.totalDurationSeconds / this.totalActiveTime) * 100 : 0
    }));

    // Sort by duration (descending)
    this.activitySummary.sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);
  }


  goBack() {
    if (this.employeeId) {
      this.router.navigate(['/admin/employee-attendance', this.employeeId]);
    } else {
      this.router.navigate(['/admin/manage-employee']);
    }
  }


  getApplicationIcon(applicationName: string): string {
    // Simple icon mapping based on application name
    const iconMap: { [key: string]: string } = {
      'chrome': 'pi-globe',
      'firefox': 'pi-globe',
      'edge': 'pi-globe',
      'safari': 'pi-globe',
      'notepad': 'pi-file',
      'word': 'pi-file-word',
      'excel': 'pi-file-excel',
      'powerpoint': 'pi-file-pdf',
      'outlook': 'pi-envelope',
      'teams': 'pi-users',
      'zoom': 'pi-video',
      'slack': 'pi-comments',
      'discord': 'pi-comments',
      'spotify': 'pi-play',
      'vlc': 'pi-play',
      'photoshop': 'pi-image',
      'illustrator': 'pi-image',
      'visual studio': 'pi-code',
      'vscode': 'pi-code',
      'sublime': 'pi-code',
      'atom': 'pi-code',
      'terminal': 'pi-terminal',
      'cmd': 'pi-terminal',
      'powershell': 'pi-terminal',
      'file explorer': 'pi-folder',
      'explorer': 'pi-folder'
    };

    const lowerName = applicationName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }

    return 'pi-desktop'; // Default icon
  }

}
