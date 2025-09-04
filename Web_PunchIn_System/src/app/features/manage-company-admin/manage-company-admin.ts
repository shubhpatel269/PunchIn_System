import { Component, OnInit, OnDestroy } from '@angular/core';
import { CompanyAdminService } from '../../shared/services/company-admin.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AddAdmin } from '../add-admin/add-admin';

interface CompanyAdmin {
  id: number;
  companyId: number;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
  dob?: string;
  displayId: number; // Sequential display ID
}

@Component({
  selector: 'app-manage-company-admin',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    RouterModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule
  ],
  templateUrl: './manage-company-admin.html',
  styleUrls: ['./manage-company-admin.css'],
  providers: [DialogService, ConfirmationService, MessageService]
})
export default class ManageCompanyAdmin implements OnInit, OnDestroy {
  admins: CompanyAdmin[] = [];
  loading: boolean = true;
  error: string | null = null;
  private dialogRef?: DynamicDialogRef;

  constructor(
    public dialogService: DialogService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private companyAdminService: CompanyAdminService
  ) { }

  ngOnInit() {
    this.loading = true;
    this.error = null;

    this.companyAdminService.getAdmins().subscribe({
      next: (admins: any[]) => {
        this.admins = admins.map((a, index) => ({
          companyId: a.companyId,
          id: a.adminId,
          name: `${a.adminFirstName} ${a.adminLastName || ''}`.trim(),
          email: a.adminEmail,
          phone: a.adminPhone,
          status: a.isActive ? 'Active' : 'Inactive',
          lastLogin: a.adminUpdatedAt ? new Date(a.adminUpdatedAt) : undefined,
          dob: a.adminDob,
          displayId: index + 1 // Sequential display ID starting from 1
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading admins:', err);

        if (err.status === 401) {
          this.error = 'Your session has expired. Please log in again.';
          // Optionally redirect to login
          // this.router.navigate(['/login']);
        } else {
          this.error = 'Failed to load admin data. Please try again later.';
        }

        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.error,
          life: 5000
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  addAdmin() {
    this.dialogRef = this.dialogService.open(AddAdmin, {
      width: '35vw',
      transitionOptions: '0ms',
      styleClass: 'right-model', 
      baseZIndex: 10000,
      data: { admin: null } // Initialize with null for new admin
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        this.loadAdmins(); // Reload the admin list from API
        // Success message is already shown by the add-admin component
      }
    });
  }

  editAdmin(admin: CompanyAdmin) {
    this.dialogRef = this.dialogService.open(AddAdmin, {
      width: '35vw',
      styleClass: 'right-model',
      contentStyle: { 'max-height': '90vh', 'overflow': 'auto' },
      baseZIndex: 10000,
      data: {
        admin: {
          adminId: admin.id,
          companyId: admin.companyId,
          adminFirstName: admin.name.split(' ')[0],
          adminLastName: admin.name.split(' ').slice(1).join(' '),
          adminEmail: admin.email,
          adminPhone: admin.phone,
          adminDob: admin.dob || '',
          isActive: admin.status === 'Active'
        }
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        this.loadAdmins(); // Reload the admin list from API
        // Success message is already shown by the add-admin component
      }
    });
  }

  deleteAdmin(admin: CompanyAdmin) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${admin.name}? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.companyAdminService.deleteAdmin(admin.id).subscribe({
          next: () => {
            this.admins = this.admins.filter(a => a.id !== admin.id);
            this.showSuccess('Admin deleted successfully');
            this.loading = false;
          },
          error: (err) => {
            console.error('Error deleting admin:', err);
            this.showError('Failed to delete admin');
            this.loading = false;
          }
        });
      }
    });
  }


  private showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }

  private showError(message: string) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  private loadAdmins() {
    this.loading = true;
    this.companyAdminService.getAdmins().subscribe({
      next: (admins: any[]) => {
        this.admins = admins.map((a, index) => ({
          companyId: a.companyId,
          id: a.adminId,
          name: `${a.adminFirstName} ${a.adminLastName || ''}`.trim(),
          email: a.adminEmail,
          phone: a.adminPhone,
          status: a.isActive ? 'Active' : 'Inactive',
          lastLogin: a.adminUpdatedAt ? new Date(a.adminUpdatedAt) : undefined,
          dob: a.adminDob,
          displayId: index + 1 // Sequential display ID starting from 1
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading admins:', err);
        this.error = 'Failed to load admin data. Please try again later.';
        this.loading = false;
        this.showError(this.error);
      }
    });
  }
}
