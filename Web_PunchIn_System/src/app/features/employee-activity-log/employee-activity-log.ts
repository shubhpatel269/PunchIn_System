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
  isRunning: boolean;
  isIdleAdjusted?: boolean; // Flag to indicate if this activity was adjusted for idle time
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
  isSessionActive: boolean = false;
  
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
  
  // Timer for refreshing running durations
  private refreshTimer: any;

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
        this.startRefreshTimer();
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
    // Cleanup timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  loadSessionData() {
    if (!this.sessionId || !this.employeeId) return;
    
    // Check if session is active by looking at session status
    // For now, we'll determine if session is active based on whether there's an end time
    // You can enhance this by calling a session API endpoint
    this.isSessionActive = !this.sessionEndTime; // If no end time, session is active
  }

  loadActivityData() {
    if (!this.sessionId) return;

    // Load activity logs
    this.isLoadingLogs = true;
    this.isLoadingSummary = true;
    
    this.activityLogService.getActivityLogsBySession(this.sessionId).subscribe({
      next: (logs) => {
        // Calculate actual durations based on timestamps since agent logs DurationSeconds as 0
        const logsWithCalculatedDurations = this.calculateActivityDurations(logs);
        
        this.activityLogs = logsWithCalculatedDurations.map((log, index) => ({
          ...log,
          formattedTimestamp: this.activityLogService.formatTimestamp(log.activityTimestamp),
          formattedDuration: log.durationSeconds ? this.activityLogService.formatDuration(log.durationSeconds) : '-',
          activityTypeDisplay: this.activityLogService.getActivityTypeDisplayName(log.activityType),
          activityTypeColor: this.activityLogService.getActivityTypeColor(log.activityType),
          isRunning: index === logsWithCalculatedDurations.length - 1 && this.isSessionActive,
          isIdleAdjusted: (log as any).isIdleAdjusted || false
        }));
        
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
   * Special handling for idle states to prevent double-counting idle time
   */
  private calculateActivityDurations(logs: ActivityLog[]): ActivityLog[] {
    if (logs.length === 0) return logs;

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.activityTimestamp).getTime() - new Date(b.activityTimestamp).getTime()
    );

    const logsWithDurations: ActivityLog[] = [];
    const IDLE_THRESHOLD_MINUTES = 5; // 5 minutes idle threshold
    const IDLE_THRESHOLD_SECONDS = IDLE_THRESHOLD_MINUTES * 60;

    for (let i = 0; i < sortedLogs.length; i++) {
      const currentLog = { ...sortedLogs[i] };
      
      // For the last log, we can't calculate duration (no next activity)
      if (i === sortedLogs.length - 1) {
        // For the last activity, check if session is active
        if (this.isSessionActive) {
          // Calculate duration from last activity time to current time
          const currentTime = new Date().getTime();
          const lastActivityTime = new Date(currentLog.activityTimestamp).getTime();
          const durationSeconds = Math.floor((currentTime - lastActivityTime) / 1000);
          
          // Cap duration at reasonable limits (max 1 hour)
          currentLog.durationSeconds = Math.min(Math.max(durationSeconds, 1), 3600);
        } else {
          // Session ended, use default duration for last activity
          currentLog.durationSeconds = 300; // 5 minutes default
        }
      } else {
        const nextLog = sortedLogs[i + 1];
        const currentTime = new Date(currentLog.activityTimestamp).getTime();
        const nextTime = new Date(nextLog.activityTimestamp).getTime();
        
        // Calculate duration in seconds
        const durationSeconds = Math.floor((nextTime - currentTime) / 1000);
        
        // Cap duration at reasonable limits (max 1 hour per activity)
        currentLog.durationSeconds = Math.min(Math.max(durationSeconds, 1), 3600);
      }
      
      logsWithDurations.push(currentLog);
    }

    // Now apply idle state adjustments
    const adjustedLogs = this.adjustIdleStateDurations(logsWithDurations, IDLE_THRESHOLD_SECONDS);

    return adjustedLogs;
  }

  /**
   * Adjust durations to properly handle idle states
   * When an IDLE_STATE activity is detected, subtract the idle time from the previous activity
   * and ensure the idle activity gets the proper duration
   */
  private adjustIdleStateDurations(logs: ActivityLog[], idleThresholdSeconds: number): ActivityLog[] {

    for (let i = 0; i < logs.length; i++) {
      const currentLog = logs[i];
      
      // Check if current activity is an idle state
      if (currentLog.activityType === 'IDLE_STATE' && currentLog.applicationName === 'System') {
        
        // Find the previous non-idle activity
        let previousNonIdleIndex = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (logs[j].activityType !== 'IDLE_STATE' && logs[j].applicationName !== 'System') {
            previousNonIdleIndex = j;
            break;
          }
        }
        
        if (previousNonIdleIndex !== -1) {
          const previousLog = logs[previousNonIdleIndex];
          const previousDuration = previousLog.durationSeconds || 0;
          
          // Check if the previous activity duration is significantly longer than expected
          // This indicates it includes idle time that should be attributed to the idle state
          if (previousDuration >= idleThresholdSeconds) {
            // Calculate the actual idle duration
            // For cases like 5m 59s, we want to extract approximately 5 minutes for idle
            let idleDuration: number;
            
            if (previousDuration >= idleThresholdSeconds && previousDuration <= idleThresholdSeconds + 120) {
              // If duration is close to threshold (within 2 minutes), use the threshold
              idleDuration = idleThresholdSeconds;
            } else if (previousDuration > idleThresholdSeconds + 120) {
              // If duration is much longer, use a reasonable idle duration
              idleDuration = Math.min(idleThresholdSeconds, 300); // Max 5 minutes for idle
            } else {
              // Fallback to a portion of the duration
              idleDuration = Math.min(previousDuration * 0.8, idleThresholdSeconds);
            }
            
            const adjustedPreviousDuration = Math.max(previousDuration - idleDuration, 60); // Minimum 1 minute
            
            // Update the previous activity duration and mark as adjusted
            logs[previousNonIdleIndex].durationSeconds = adjustedPreviousDuration;
            (logs[previousNonIdleIndex] as any).isIdleAdjusted = true;
            
            // Update the idle activity duration
            currentLog.durationSeconds = idleDuration;
            
            // Special case: If the next activity is ACTIVE_STATE, it should have minimal duration
            if (i + 1 < logs.length) {
              const nextLog = logs[i + 1];
              if (nextLog.activityType === 'ACTIVE_STATE' && nextLog.applicationName === 'System') {
                // ACTIVE_STATE typically represents the transition back to active, should be minimal
                nextLog.durationSeconds = Math.min(nextLog.durationSeconds || 1, 60); // Max 1 minute
              }
            }
          }
        }
      }
    }

    return logs;
  }

  /**
   * Calculate activity summary from raw logs since API summary uses DurationSeconds = 0
   */
  private calculateSummaryFromLogs() {
    if (this.activityLogs.length === 0) {
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

    // Calculate summary for each application
    this.activitySummary = Array.from(appGroups.entries()).map(([appName, logs]) => {
      const totalDuration = logs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
      const sortedLogs = logs.sort((a, b) => 
        new Date(a.activityTimestamp).getTime() - new Date(b.activityTimestamp).getTime()
      );
      
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


  startRefreshTimer() {
    // Only start timer if session is active
    if (this.isSessionActive) {
      this.refreshTimer = setInterval(() => {
        // Update the duration for the last (running) activity
        if (this.activityLogs.length > 0) {
          const lastLog = this.activityLogs[this.activityLogs.length - 1];
          if (lastLog.isRunning) {
            // Recalculate duration from last activity time to current time
            const currentTime = new Date().getTime();
            const lastActivityTime = new Date(lastLog.activityTimestamp).getTime();
            const durationSeconds = Math.floor((currentTime - lastActivityTime) / 1000);
            
            // Update the duration
            lastLog.durationSeconds = Math.min(Math.max(durationSeconds, 1), 3600);
            
            // Trigger change detection
            this.activityLogs = [...this.activityLogs];
          }
        }
      }, 5000); // Update every 5 seconds
    }
  }

  getFormattedDuration(log: ActivityLogWithDisplay): string {
    if (log.isRunning) {
      return 'Running';
    }
    return log.durationSeconds ? this.activityLogService.formatDuration(log.durationSeconds) : '-';
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
