import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-welcome-popup',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    AvatarModule,
    DividerModule
  ],
  template: `
    <div class="fixed inset-0 bg-transparent flex items-center justify-center z-50" *ngIf="visible">
      <div class="relative bg-white p-6 rounded-2xl shadow-2xl max-w-[500px] w-full mx-4 text-center border-2 border-blue-200"
        style="background-color: #F0F9FF;">
        
        <!-- Close Button -->
        <button 
          (click)="onClose()" 
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10">
          <i class="pi pi-times text-xl"></i>
        </button>

        <div class="flex flex-col items-center gap-4">
          <img src="/assets/images/success.gif" alt="Success" style="width: 96px; height: 96px; margin-bottom: 1rem;" />
          <h2 class="text-xl font-semibold text-[#2e9aa7]">
            Punch In Successful 🎉</h2>
          <p class="text-sm text-gray-600">
            Here's a quick summary of your punch in:
          </p>
        </div>

        <div class="mt-6 text-left space-y-4">
          <div class="bg-[#E0F2FE] p-5 rounded-xl border border-[#b6e0e3] shadow-sm">
            <div class="mb-3">
              <h3 class="text-xs font-semibold text-gray-500 uppercase">
                Name
              </h3>
              <p class="text-base font-semibold text-[#2e9aa7]">
                {{userData.name}} </p>
            </div>

            <div class="mb-3">
              <h3 class="text-xs font-semibold text-gray-500 uppercase">
                Employee ID
              </h3>
              <p class="text-base font-medium text-gray-700">
                {{userData.employeeId}} </p>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <h3 class="text-xs font-semibold text-gray-500 uppercase">
                  Date
                </h3>
                <p class="text-base font-medium text-gray-700">
                  {{userData.punchedTime}} </p>
              </div>
              <div>
                <h3 class="text-xs font-semibold text-gray-500 uppercase">
                  Location
                </h3>
                <p class="text-base font-medium text-gray-700">
                  {{userData.location}} </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <h3 class="text-xs font-semibold text-gray-500 uppercase">
                  Time
                </h3>
                <p class="text-base font-medium text-gray-700">
                  {{userData.punchedTime}} </p>
              </div>
              <div>
                <h3 class="text-xs font-semibold text-gray-500 uppercase">
                  Status
                </h3>
                <p class="text-base font-medium text-green-600">
                  Active </p>
              </div>
            </div>
          </div>

          <div class="flex justify-center mt-6">
            <button 
              (click)="onClose()" 
              class="bg-[#2e9aa7] text-white px-6 py-2 rounded-lg hover:bg-[#258a8a] transition-colors">
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class WelcomePopupComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() userData: any = {};
  @Output() close = new EventEmitter<void>();

  ngOnInit() {
    // Load user data from localStorage if not provided
    if (!this.userData.name) {
      const data = localStorage.getItem('punchInUser');
      if (data) {
        try {
          this.userData = JSON.parse(data);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    }
  }

  onClose() {
    this.close.emit();
  }
}