import { Component, OnInit } from '@angular/core';
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
import { DesignationService, Designation } from '../../shared/services/designation.service';

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
export class ManageDesignation implements OnInit {
  designations: Designation[] = [];
  loading = false;
  
  selectedDesignation: Designation = this.createEmptyDesignation();
  displayDialog = false;
  submitted = false;
  
  // Inline editing properties
  editingDesignation: Designation | null = null;
  editingData: { name: string; description: string } = { name: '', description: '' };
  
  // For confirm dialog
  private confirmReject: (() => void) | null = null;
  private confirmAccept: (() => void) | null = null;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private designationService: DesignationService
  ) {}

  ngOnInit() {
    this.loadDesignations();
  }

  loadDesignations() {
    this.loading = true;
    this.designationService.getDesignations().subscribe({
      next: (response: any) => {
        console.log('Raw API response:', response);
        
        // Handle different possible response structures
        let designations: any[] = [];
        
        if (Array.isArray(response)) {
          // Direct array response
          designations = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          // Wrapped in data property
          designations = response.data;
        } else if (response && response.designations && Array.isArray(response.designations)) {
          // Wrapped in designations property
          designations = response.designations;
        } else if (response && response.result && Array.isArray(response.result)) {
          // Wrapped in result property
          designations = response.result;
        }
        
        console.log('Processed designations:', designations);
        console.log('Number of designations:', designations?.length);
        
        // Map the data to our interface if needed
        this.designations = designations.map(d => {
          console.log('Mapping designation data:', d);
          return {
            id: d.id || d.designationId || 0,
            name: d.name || d.designationName || '',
            description: d.description || d.designationDescription || '',
            isDeleted: d.isDeleted || false,
            deletedAt: d.deletedAt ? new Date(d.deletedAt) : undefined,
            deletedById: d.deletedById || undefined,
            createdAt: d.createdAt ? new Date(d.createdAt) : new Date()
          };
        });
        
        if (this.designations.length === 0) {
          console.log('No designations found in the response');
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading designations:', error);
        
        if (error.status === 401) {
          this.messageService.add({
            severity: 'error',
            summary: 'Authentication Error',
            detail: 'Your session has expired. Please log in again.',
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load designations',
            life: 3000
          });
        }
        this.loading = false;
      }
    });
  }

  openNew() {
    this.selectedDesignation = this.createEmptyDesignation();
    this.submitted = false;
    this.displayDialog = true;
  }

  editDesignation(designation: Designation) {
    this.editingDesignation = designation;
    this.editingData = {
      name: designation.name,
      description: designation.description
    };
  }

  cancelEdit() {
    this.editingDesignation = null;
    this.editingData = { name: '', description: '' };
  }

  saveInlineEdit() {
    if (!this.editingDesignation || !this.editingData.name.trim()) {
      return;
    }

    // Try different field name variations that the API might expect
    const updateData = {
      id: this.editingDesignation.id,
      name: this.editingData.name,
      description: this.editingData.description,
      isDeleted: this.editingDesignation.isDeleted,
      // Also try with potential API field names
      designationName: this.editingData.name,
      designationDescription: this.editingData.description
    };

    console.log('Sending update data:', updateData);
    console.log('Designation ID:', this.editingDesignation.id);
    console.log('Editing data:', this.editingData);
    console.log('Original designation:', this.editingDesignation);

    this.designationService.updateDesignation(this.editingDesignation.id, updateData).subscribe({
      next: () => {
        // Update the local data
        const index = this.designations.findIndex(d => d.id === this.editingDesignation!.id);
        if (index >= 0) {
          this.designations[index] = {
            ...this.designations[index],
            name: this.editingData.name,
            description: this.editingData.description
          };
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Designation Updated',
          life: 3000
        });
        
        this.cancelEdit();
      },
      error: (error) => {
        console.error('Error updating designation:', error);
        if (error.status === 401) {
          this.messageService.add({
            severity: 'error',
            summary: 'Authentication Error',
            detail: 'Your session has expired. Please log in again.',
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update designation',
            life: 3000
          });
        }
      }
    });
  }

  isEditing(designation: Designation): boolean {
    return this.editingDesignation?.id === designation.id;
  }

  deleteDesignation(designation: Designation) {
    this.confirmAccept = () => {
      this.designationService.deleteDesignation(designation.id).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Designation Deleted',
            life: 3000
          });
          this.loadDesignations(); // Reload the list
        },
        error: (error) => {
          console.error('Error deleting designation:', error);
          if (error.status === 401) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Error',
              detail: 'Your session has expired. Please log in again.',
              life: 5000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete designation',
              life: 3000
            });
          }
        }
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
      const newDesignation = {
        name: this.selectedDesignation.name,
        description: this.selectedDesignation.description,
        isDeleted: false
      };

      this.designationService.createDesignation(newDesignation).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Designation Created',
            life: 3000
          });
          this.loadDesignations(); // Reload the list
          this.displayDialog = false;
          this.selectedDesignation = this.createEmptyDesignation();
        },
        error: (error) => {
          console.error('Error creating designation:', error);
          if (error.status === 401) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Error',
              detail: 'Your session has expired. Please log in again.',
              life: 5000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create designation',
              life: 3000
            });
          }
        }
      });
    } else {
      // Update existing designation
      const updateData = {
        name: this.selectedDesignation.name,
        description: this.selectedDesignation.description
      };

      this.designationService.updateDesignation(this.selectedDesignation.id, updateData).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Designation Updated',
            life: 3000
          });
          this.loadDesignations(); // Reload the list
          this.displayDialog = false;
          this.selectedDesignation = this.createEmptyDesignation();
        },
        error: (error) => {
          console.error('Error updating designation:', error);
          if (error.status === 401) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Error',
              detail: 'Your session has expired. Please log in again.',
              life: 5000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update designation',
              life: 3000
            });
          }
        }
      });
    }
  }

  private createEmptyDesignation(): Designation {
    return {
      id: 0,
      name: '',
      description: '',
      isDeleted: false,
      deletedAt: undefined,
      deletedById: undefined,
      createdAt: new Date()
    } as Designation;
  }



  
  // For confirm dialog buttons
  accept() {
    this.confirmAccept?.();
  }
  
  reject() {
    this.confirmReject?.();
  }
}
