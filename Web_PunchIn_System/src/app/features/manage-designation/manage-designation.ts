import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';

interface Designation {
  id: number;
  name: string;
  email: string; 
  description: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedById?: number;
  createdAt: Date;
}

@Component({
  selector: 'app-manage-designation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    CheckboxModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './manage-designation.html'
})
export class ManageDesignation {
  designations: Designation[] = [
    { 
      id: 1, 
      name: 'Manager',
      email: 'manager@example.com',
      description: 'Manages the team', 
      isDeleted: false, 
      deletedAt: undefined,
      deletedById: undefined,
      createdAt: new Date() 
    },
    { 
      id: 2, 
      name: 'Developer',
      email: 'dev@example.com',
      description: 'Writes code', 
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined,
      createdAt: new Date() 
    },
    { 
      id: 3, 
      name: 'Designer',
      email: 'designer@example.com',
      description: 'Designs UI/UX', 
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined,
      createdAt: new Date() 
    },
  ];
  
  selectedDesignation: Designation = this.createEmptyDesignation();
  displayDialog = false;
  submitted = false;
  
  // For confirm dialog
  private confirmReject: (() => void) | null = null;
  private confirmAccept: (() => void) | null = null;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  openNew() {
    this.selectedDesignation = this.createEmptyDesignation();
    this.submitted = false;
    this.displayDialog = true;
  }

  editDesignation(designation: Designation) {
    this.selectedDesignation = { ...designation };
    this.submitted = false;
    this.displayDialog = true;
  }

  deleteDesignation(designation: Designation) {
    this.confirmAccept = () => {
      // In a real app, you would call a service here
      this.messageService.add({
        severity: 'success',
        summary: 'Successful',
        detail: 'Designation Deleted',
        life: 3000
      });
      this.confirmAccept = null;
      this.confirmReject = null;
    };
    
    this.confirmReject = () => {
      this.confirmAccept = null;
      this.confirmReject = null;
    };
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${designation.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.confirmAccept?.(),
      reject: () => this.confirmReject?.()
    });
  }

  saveDesignation() {
    this.submitted = true;

    if (!this.selectedDesignation.name?.trim()) {
      return;
    }

    if (this.selectedDesignation.id === 0) {
      // Add new designation
      this.selectedDesignation.id = this.createId();
      this.selectedDesignation.createdAt = new Date();
      this.designations = [...this.designations, { ...this.selectedDesignation }];
      this.messageService.add({
        severity: 'success',
        summary: 'Successful',
        detail: 'Designation Created',
        life: 3000
      });
    } else {
      // Update existing designation
      const index = this.designations.findIndex(d => d.id === this.selectedDesignation.id);
      if (index >= 0) {
        this.designations[index] = { ...this.selectedDesignation };
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Designation Updated',
          life: 3000
        });
      }
    }

    this.designations = [...this.designations];
    this.displayDialog = false;
    this.selectedDesignation = this.createEmptyDesignation();
  }

  private createEmptyDesignation(): Designation {
    return {
      id: 0,
      name: '',
      email: '',
      description: '',
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined,
      createdAt: new Date()
    } as Designation;
  }

  private createId(): number {
    return this.designations.length > 0 ? Math.max(...this.designations.map(d => d.id)) + 1 : 1;
  }

  
  // For confirm dialog buttons
  accept() {
    this.confirmAccept?.();
  }
  
  reject() {
    this.confirmReject?.();
  }
}
