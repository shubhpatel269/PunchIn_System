import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ImageModule } from 'primeng/image';
import { EmployeePunchInService, EmployeePunchInData, PunchInDetail } from '../../shared/services/employee-punchin.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-employee-punchin',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    CardModule, 
    SkeletonModule, 
    Toast,
    ImageModule
  ],
  templateUrl: './employee-punchin.html',
  styleUrl: './employee-punchin.css',
  providers: [MessageService]
})
export class EmployeePunchInComponent implements OnInit, OnDestroy {
  employeeId: string = '';
  employeePunchInData: EmployeePunchInData | null = null;
  loading = false;
  skeletonRows: any[] = Array(5).fill({});
  
  private destroy$ = new Subject<void>();

  constructor(
    private employeePunchInService: EmployeePunchInService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Get employee ID from route parameters (admin context only)
    this.route.params.subscribe(params => {
      this.employeeId = params['id'];
      if (this.employeeId) {
        this.loadEmployeePunchIns();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    // Always go back to manage employee (admin context only)
    this.router.navigate(['/admin/manage-employee']);
  }

  loadEmployeePunchIns() {
    if (!this.employeeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee ID is required'
      });
      return;
    }

    this.loading = true;
    this.employeePunchInService.getEmployeePunchIns(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.employeePunchInData = data;
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load employee punch-in data'
          });
          console.error('Error loading employee punch-ins:', error);
        }
      });
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  getEmployeeFullName(): string {
    if (!this.employeePunchInData) return '';
    
    const { employeeFirstName, employeeMiddleName, employeeLastName } = this.employeePunchInData;
    return [employeeFirstName, employeeMiddleName, employeeLastName]
      .filter(name => name && name.trim())
      .join(' ');
  }

  getEmployeeFaceImageSrc(): string {
    if (!this.employeePunchInData?.employeeFaceImage) {
      return 'assets/images/default-avatar.png'; // You can add a default avatar image
    }
    
    // Check if it's a base64 image or a URL
    if (this.employeePunchInData.employeeFaceImage.startsWith('data:image')) {
      return this.employeePunchInData.employeeFaceImage;
    }
    
    return this.employeePunchInData.employeeFaceImage;
  }

  getPunchFaceImageSrc(punchFaceUrl: string): string {
    if (!punchFaceUrl) {
      return 'assets/images/default-avatar.png';
    }
    
    // Check if it's a base64 image or a URL
    if (punchFaceUrl.startsWith('data:image')) {
      return punchFaceUrl;
    }
    
    return punchFaceUrl;
  }

}
