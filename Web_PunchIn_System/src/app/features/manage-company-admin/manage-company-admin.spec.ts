import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmationService, MessageService } from 'primeng/api';

import ManageCompanyAdmin from './manage-company-admin';

describe('ManageCompanyAdmin', () => {
  let component: ManageCompanyAdmin;
  let fixture: ComponentFixture<ManageCompanyAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        RouterTestingModule,
        TableModule,
        ButtonModule,
        ConfirmDialogModule,
        ToastModule,
        TagModule,
        TooltipModule,
        InputTextModule,
        MultiSelectModule,
        ManageCompanyAdmin
      ],
      providers: [
        DialogService,
        MessageService,
        ConfirmationService,
        { provide: DynamicDialogRef, useValue: { close: () => {} } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageCompanyAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial admin data', () => {
    expect(component.admins).toBeDefined();
    expect(component.admins.length).toBeGreaterThan(0);
  });

  it('should add a new admin', () => {
    const initialCount = component.admins.length;
    component.admins.push({
      id: 3,
      name: 'New Admin',
      email: 'new@admin.com',
      phone: '1234567890',
      status: 'Active',
      lastLogin: new Date()
    });
    expect(component.admins.length).toBe(initialCount + 1);
  });

  it('should remove an admin', () => {
    const testAdmin = {
      id: 4,
      name: 'Temp Admin',
      email: 'temp@admin.com',
      phone: '1234567890',
      status: 'Active' as const,
      lastLogin: new Date()
    };
    component.admins.push(testAdmin);
    const initialCount = component.admins.length;
    component.deleteAdmin(testAdmin);
    expect(component.admins.length).toBe(initialCount - 1);
  });

  it('should toggle admin status', () => {
    const admin = component.admins[0];
    const initialStatus = admin.status;
    component.toggleStatus(admin);
    expect(admin.status).not.toBe(initialStatus);
    // Toggle back to original status
    component.toggleStatus(admin);
    expect(admin.status).toBe(initialStatus);
  });

  it('should get next available ID', () => {
    const nextId = component.getNextId();
    expect(nextId).toBeGreaterThan(0);
    // Verify it's higher than all existing IDs
    const maxExistingId = Math.max(...component.admins.map((a: { id: number }) => a.id));
    expect(nextId).toBeGreaterThan(maxExistingId);
  });
});
