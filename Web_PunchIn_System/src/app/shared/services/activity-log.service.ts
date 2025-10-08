import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivityLog {
  activityLogId: number;
  sessionId: number;
  employeeId: string;
  activityType: string;
  applicationName: string;
  windowTitle?: string;
  processName?: string;
  processId?: number;
  activityTimestamp: string;
  durationSeconds?: number;
  isActiveWindow: boolean;
  metadata?: string;
  createdAt: string;
  computerName?: string;
}

export interface ActivityLogSummary {
  applicationName: string;
  processName?: string;
  totalDurationSeconds: number;
  activityCount: number;
  firstActivity: string;
  lastActivity: string;
  isCurrentlyActive: boolean;
}

export interface ActivityLogFilter {
  sessionId?: number;
  employeeId?: string;
  activityType?: string;
  applicationName?: string;
  startDate?: string;
  endDate?: string;
  isActiveWindow?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  private apiUrl = 'https://localhost:7127/api/ActivityLog';

  constructor(private http: HttpClient) {}

  /**
   * Get activity logs for a specific session
   * @param sessionId The session ID to get activity logs for
   * @returns Observable of activity logs array
   */
  getActivityLogsBySession(sessionId: number): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.apiUrl}/Session/${sessionId}`);
  }

  /**
   * Get activity log summary for a specific session
   * @param sessionId The session ID to get summary for
   * @returns Observable of activity log summary array
   */
  getActivityLogSummaryBySession(sessionId: number): Observable<ActivityLogSummary[]> {
    return this.http.get<ActivityLogSummary[]>(`${this.apiUrl}/Session/${sessionId}/Summary`);
  }

  /**
   * Get all activity logs with optional filtering
   * @param filter Optional filter parameters
   * @returns Observable of activity logs array
   */
  getActivityLogs(filter?: ActivityLogFilter): Observable<ActivityLog[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.sessionId) params = params.set('sessionId', filter.sessionId.toString());
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.activityType) params = params.set('activityType', filter.activityType);
      if (filter.applicationName) params = params.set('applicationName', filter.applicationName);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.isActiveWindow !== undefined) params = params.set('isActiveWindow', filter.isActiveWindow.toString());
      if (filter.pageNumber) params = params.set('pageNumber', filter.pageNumber.toString());
      if (filter.pageSize) params = params.set('pageSize', filter.pageSize.toString());
    }

    return this.http.get<ActivityLog[]>(this.apiUrl, { params });
  }

  /**
   * Get a specific activity log by ID
   * @param id The activity log ID
   * @returns Observable of activity log
   */
  getActivityLog(id: number): Observable<ActivityLog> {
    return this.http.get<ActivityLog>(`${this.apiUrl}/${id}`);
  }

  /**
   * Format duration in seconds to human-readable format
   * @param seconds Duration in seconds
   * @returns Formatted duration string
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      let result = `${hours}h`;
      if (minutes > 0) result += ` ${minutes}m`;
      if (remainingSeconds > 0) result += ` ${remainingSeconds}s`;
      
      return result;
    }
  }

  /**
   * Format timestamp to user-friendly format
   * @param timestamp ISO timestamp string
   * @returns Formatted time string
   */
  formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return timestamp;
    }
  }

  /**
   * Get activity type display name
   * @param activityType The activity type
   * @returns Human-readable activity type
   */
  getActivityTypeDisplayName(activityType: string): string {
    const activityTypeMap: { [key: string]: string } = {
      'APP_OPENED': 'Application Opened',
      'APP_CLOSED': 'Application Closed',
      'APP_FOCUS_CHANGED': 'Focus Changed',
      'WINDOW_ACTIVE': 'Window Active',
      'WINDOW_INACTIVE': 'Window Inactive',
      'APP_MINIMIZED': 'Application Minimized',
      'APP_RESTORED': 'Application Restored'
    };

    return activityTypeMap[activityType] || activityType;
  }

  /**
   * Get activity type color for UI display
   * @param activityType The activity type
   * @returns CSS color class
   */
  getActivityTypeColor(activityType: string): string {
    const colorMap: { [key: string]: string } = {
      'APP_OPENED': 'success',
      'APP_CLOSED': 'danger',
      'APP_FOCUS_CHANGED': 'info',
      'WINDOW_ACTIVE': 'success',
      'WINDOW_INACTIVE': 'warning',
      'APP_MINIMIZED': 'secondary',
      'APP_RESTORED': 'primary'
    };

    return colorMap[activityType] || 'secondary';
  }
}
