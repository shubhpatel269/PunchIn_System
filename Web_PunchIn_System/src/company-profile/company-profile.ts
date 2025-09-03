import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';


interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-manage-company',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    ConfirmDialogModule,
    CheckboxModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './company-profile.html',
  styleUrls: ['./company-profile.css']
})
export default class ManageCompany implements OnInit {
  companies: Company[] = [
    {
      id: 1,
      name: 'Tech Solutions Inc.',
      email: 'info@techsolutions.com',
      phone: '+1 234 567 8901',
      type: 'IT Services',
      address: '123 Tech Park',
      city: 'San Francisco',
      state: 'California',
      isActive: true,
      createdAt: new Date()
    }
  ];

  company: Company = this.createEmptyCompany();
  displayDialog = false;
  submitted = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    console.log('CompanyProfile component initialized');
  }

  openNew() {
    this.company = this.createEmptyCompany();
    this.submitted = false;
    this.displayDialog = true;
  }

  editCompany(company: Company) {
    this.company = { ...company };
    this.displayDialog = true;
  }

  deleteCompany(company: Company) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${company.name}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.companies = this.companies.filter(val => val.id !== company.id);
        this.company = this.createEmptyCompany();
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Company Deleted', life: 3000 });
      }
    });
  }

  saveCompany() {
    this.submitted = true;
    
    if (this.company.name?.trim()) {
      if (this.company.id) {
        // Update existing
        const index = this.companies.findIndex(c => c.id === this.company.id);
        if (index !== -1) {
          this.companies[index] = { ...this.company };
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Company Updated', life: 3000 });
        }
      } else {
        // Add new
        this.company.id = this.createId();
        this.company.createdAt = new Date();
        this.companies.push({ ...this.company });
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Company Created', life: 3000 });
      }

      this.companies = [...this.companies];
      this.displayDialog = false;
      this.company = this.createEmptyCompany();
    }
  }

  onDialogHide() {
    // Reset form and submission state when dialog is closed
    this.submitted = false;
    this.company = this.createEmptyCompany();
  }

  createEmptyCompany(): Company {
    return {
      id: 0,
      name: '',
      email: '',
      phone: '',
      type: '',
      address: '',
      city: '',
      state: '',
      isActive: true,
      createdAt: new Date()
    };
  }

  private createId(): number {
    return Math.max(...this.companies.map(c => c.id), 0) + 1;
  }
}
