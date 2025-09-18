import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { EmployeeService, Employee } from '../../shared/services/employee.service';
import { DesignationService, Designation } from '../../shared/services/designation.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';


@Component({
  selector: 'app-manage-employee',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ConfirmDialogModule, Toast, RouterModule, SkeletonModule],
  templateUrl: './manage-employee.html',
  styleUrl: './manage-employee.css',
  providers: [ConfirmationService, MessageService]
})
export class ManageEmployee implements OnInit, OnDestroy {
  employees: Employee[] = [];
  designations: Designation[] = [];
  designationMap: { [key: number]: string } = {};
  loading = false;
  loadingDesignations = false;
  skeletonRows: any[] = Array(5).fill({});
  
  constructor(
    private employeeService: EmployeeService,
    private designationService: DesignationService,
    private messageService: MessageService,
    public confirmationService: ConfirmationService,
    private router: Router
  ) { }

  ngOnInit() {
    // Load designations first, then employees
    this.loadDesignations();
  }

  loadDesignations() {
    this.loadingDesignations = true;
    this.designationService.getDesignations().subscribe({
      next: (response) => {
        console.log('Designations API Response:', response);
        
        // Handle different response structures
        const designations = response.data || response || [];
        console.log('Designations array:', designations);
        
        this.designations = designations.filter((d: any) => !d.isDeleted);
        console.log('Filtered designations:', this.designations);
        
        // Create mapping for quick lookup - handle multiple possible property names
        this.designationMap = {};
        this.designations.forEach((designation: any) => {
          // Try different possible property names for the designation ID
          const id = designation.id || designation.designationId || 0;
          
          // Try different possible property names for the designation name
          const name = designation.name || 
                      designation.title || 
                      designation.designationName || 
                      designation.designation || 
                      designation.label ||
                      'Unknown';
          
          console.log(`Mapping designation: ID=${id}, Name=${name}`);
          this.designationMap[id] = name;
        });
        
        console.log('Final designation map:', this.designationMap);
        this.loadingDesignations = false;
        
        // Load employees after designations are loaded
        this.loadEmployees();
      },
      error: (error) => {
        console.error('Error loading designations:', error);
        this.loadingDesignations = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load designations'
        });
        
        // Still load employees even if designations fail
        this.loadEmployees();
      }
    });
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        console.log('Employees API Response:', data);
        this.employees = data;
        
        // Log each employee's designation-related properties
        this.employees.forEach((employee, index) => {
          console.log(`Employee ${index + 1}:`, {
            employeeId: employee.employeeId,
            employeeDesignationId: employee.employeeDesignationId,
            designationId: (employee as any).designationId,
            designation: (employee as any).designation,
            allKeys: Object.keys(employee)
          });
        });
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employees'
        });
      }
    });
  }

  ngOnDestroy() {
    // No dialog cleanup needed
  }

  onEdit(employee: Employee) {
    this.router.navigate(['/admin/edit-employee', employee.employeeId]);
  }

  addEmployee(){
    this.router.navigate(['/admin/add-employee']);
  }

  getDesignationName(designationId: number | string | null | undefined): string {
    if (this.loadingDesignations) {
      return 'Loading...';
    }
    
    if (!designationId) {
      console.log('Designation ID is null or undefined');
      return 'No Designation';
    }
    
    // Convert to number if it's a string
    const id = typeof designationId === 'string' ? parseInt(designationId, 10) : designationId;
    
    if (isNaN(id)) {
      console.log('Designation ID is not a valid number:', designationId);
      return 'Invalid Designation ID';
    }
    
    console.log(`Looking up designation for ID: ${designationId} (converted to: ${id})`);
    console.log('Current designation map:', this.designationMap);
    console.log('Available keys:', Object.keys(this.designationMap));
    
    // Try to find the designation name
    let designationName = this.designationMap[id];
    
    // If not found, try as string key as well
    if (!designationName) {
      designationName = this.designationMap[designationId.toString() as any];
    }
    
    console.log(`Found designation name: ${designationName}`);
    
    return designationName || 'Unknown Designation';
  }

  confirmDelete(event: Event, employee: Employee) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete ${employee.employeeFirstName} ${employee.employeeLastName}?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.employeeService.deleteEmployee(employee.employeeId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Employee deleted successfully.' });
            this.loadEmployees();
          },
          error: (error) => {
            console.error('Delete error:', error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete employee.' });
          }
        });
      },
    });
  }
}