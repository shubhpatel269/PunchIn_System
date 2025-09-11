import { Component, OnInit, OnDestroy } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { EmployeeService, Employee } from '../../shared/services/employee.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';


@Component({
  selector: 'app-manage-employee',
  standalone: true,
  imports: [TableModule, ButtonModule, ConfirmDialogModule, Toast, RouterModule],
  templateUrl: './manage-employee.html',
  styleUrl: './manage-employee.css',
  providers: [ConfirmationService, MessageService]
})
export class ManageEmployee implements OnInit, OnDestroy {
  employees: Employee[] = [];
  loading = false;
  
  constructor(
    private employeeService: EmployeeService,
    private messageService: MessageService,
    public confirmationService: ConfirmationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;
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