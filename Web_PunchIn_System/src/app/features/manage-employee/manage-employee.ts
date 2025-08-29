import { Component, OnInit, OnDestroy } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Employee } from '../../shared/services/employee';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AddUser } from '../add-user/add-user';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-manage-employee',
  standalone: true,
  imports: [TableModule, ButtonModule, ConfirmDialogModule, Toast, RouterModule],
  templateUrl: './manage-employee.html',
  styleUrl: './manage-employee.css',
  providers: [Employee, DialogService, ConfirmationService, MessageService]
})
export class ManageEmployee implements OnInit, OnDestroy {
  employees: any[] = [];
  private dialogRef?: DynamicDialogRef;
  constructor(
    private employeeService: Employee,
    public dialogService: DialogService,
    private messageService: MessageService,
    public confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    this.employeeService.getEmployees().subscribe((data) => {
      this.employees = data;
    });
  }

  ngOnDestroy() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  onEdit(employee: any) {
    this.dialogRef = this.dialogService.open(AddUser, {
      data: { employee },
      width: '35vw',
      styleClass: 'right-model',
      transitionOptions: '0ms',
      closable: false,
      showHeader: false,
    });
    this.dialogRef.onClose.subscribe((result) => {
      if (result === 'updated') {
        this.employeeService.getEmployees().subscribe((data) => {
          this.employees = data;
        });
      }
    });
  }

  addEmployee(){
     this.dialogRef = this.dialogService.open(AddUser, {
      width: '35vw',
      styleClass: 'right-model',
      transitionOptions: '0ms',
      closable: false,
      showHeader: false,
    });
    this.dialogRef.onClose.subscribe((result) => {
      if (result === 'updated') {
        this.employeeService.getEmployees().subscribe((data) => {
          this.employees = data;
        });
      }
    });
  }

  confirmDelete(event: Event, employee: any) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Are you sure you want to delete this user?',
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
        this.employeeService.deleteEmployee(employee.id || employee.employeeId).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User deleted successfully.' });
            this.employeeService.getEmployees().subscribe((data) => {
              this.employees = data;
            });
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete user.' });
          }
        });
      },
    });
  }
}