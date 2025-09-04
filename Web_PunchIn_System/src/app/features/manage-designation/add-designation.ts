import { Component } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-designation',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  template: `
    <div class="p-fluid">
      <div class="p-field">
        <label for="name">Designation Name</label>
        <input id="name" type="text" pInputText [(ngModel)]="designation.name" required>
      </div>
      <div class="p-d-flex p-jc-end p-mt-4">
        <button pButton type="button" label="Cancel" class="p-button-text" 
                (click)="onCancel()"></button>
        <button pButton type="button" label="Save" class="p-button-primary" 
                (click)="onSave()" [disabled]="!designation.name?.trim()"></button>
      </div>
    </div>
  `
})
export class AddDesignationComponent {
  designation: any = { name: '' };

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    if (this.config.data?.designation) {
      this.designation = { ...this.config.data.designation };
    }
  }

  onSave() {
    if (this.designation.name.trim()) {
      this.ref.close(this.designation);
    }
  }

  onCancel() {
    this.ref.close();
  }
}
