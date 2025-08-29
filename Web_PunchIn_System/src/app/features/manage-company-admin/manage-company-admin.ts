import { Component, OnInit, OnDestroy } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AddAdmin } from '../add-admin/add-admin';

interface CompanyAdmin {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  lastLogin?: Date;
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
    // Add any other required modules here
  ],
  templateUrl: './manage-company-admin.html',
  styleUrls: ['./manage-company-admin.css'],
  providers: [DialogService, ConfirmationService, MessageService]
})
export default class ManageCompanyAdmin implements OnInit, OnDestroy {
  admins: CompanyAdmin[] = [
    { id: 1, name: 'Admin One', email: 'admin1@company.com', phone: '1234567890', status: 'Active', lastLogin: new Date() },
    { id: 2, name: 'Admin Two', email: 'admin2@company.com', phone: '0987654321', status: 'Active', lastLogin: new Date() },
  ];
  
  private dialogRef?: DynamicDialogRef;
  
  constructor(
    public dialogService: DialogService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    // Load admins from your service here
    // this.loadAdmins();
  }

  ngOnDestroy() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  addAdmin() {
    this.dialogRef = this.dialogService.open(AddAdmin, {
      header: 'Add New Admin',
      width: '50%',
      contentStyle: { 'max-height': '90vh', 'overflow': 'auto' },
      baseZIndex: 10000,
      data: { admin: null } // Initialize with null for new admin
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        const newAdmin: CompanyAdmin = {
          id: this.getNextId(),
          name: result.name,
          email: result.email,
          phone: result.phone,
          status: 'Active' as const,
          lastLogin: new Date()
        };
        this.admins = [...this.admins, newAdmin];
        this.showSuccess('Admin added successfully');
      }
    });
  }

  editAdmin(admin: CompanyAdmin) {
    this.dialogRef = this.dialogService.open(AddAdmin, {
      header: 'Edit Admin',
      width: '50%',
      contentStyle: { 'max-height': '90vh', 'overflow': 'auto' },
      baseZIndex: 10000,
      data: { admin: { ...admin } }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        const index = this.admins.findIndex(a => a.id === result.id);
        if (index > -1) {
          this.admins[index] = {
            ...this.admins[index],
            name: result.name,
            email: result.email,
            phone: result.phone
          };
          this.admins = [...this.admins];
          this.showSuccess('Admin updated successfully');
        }
      }
    });
  }

  deleteAdmin(admin: CompanyAdmin) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${admin.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.admins = this.admins.filter(a => a.id !== admin.id);
        this.showSuccess('Admin deleted successfully');
      }
    });
  }

  toggleStatus(admin: CompanyAdmin) {
    admin.status = admin.status === 'Active' ? 'Inactive' : 'Active';
    this.showSuccess(`Admin status changed to ${admin.status}`);
  }

  public getNextId(): number {
    return this.admins.length > 0 ? Math.max(...this.admins.map(a => a.id)) + 1 : 1;
  }

  private showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }
}
