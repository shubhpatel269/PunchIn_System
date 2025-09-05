import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as faceapi from 'face-api.js';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';
import { DatePicker } from 'primeng/datepicker';
import { DesignationService, Designation } from '../../shared/services/designation.service';
import { EmployeeService, Employee } from '../../shared/services/employee.service';



@Component({
  selector: 'app-add-new-profile',
  templateUrl: './add-new-profile.html',
  styleUrls: ['./add-new-profile.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadModule, ToastModule, DialogModule, ButtonModule, CardModule, ImageModule, DatePicker]
})
export class AddNewProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentStep = 2;
  totalSteps = 2;
  selectedImage: string | null = null;
  uploadedFileName: string | null = null;
  showCameraDialog = false;
  showUploadDialog = false;
  private stream: MediaStream | null = null;
  private faceModelsLoaded = false;
  faceDescriptor: Float32Array | null = null;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;


  designationOptions: { label: string; value: number }[] = [];
  designations: Designation[] = [];
  loadingDesignations = false;
  isSubmitting = false;
  
  // Date picker constraints
  maxDate = new Date();
  minDate = new Date(1900, 0, 1);

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private designationService: DesignationService,
    private employeeService: EmployeeService
  ) {
    this.profileForm = this.fb.group({
      employeeId: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      designation: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      dob: ['', Validators.required],
      location: ['', Validators.required],
      image: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    // Initialize with default profile image
    this.selectedImage = 'assets/images/default-profile.png';
    
    // Load designations from service
    this.loadDesignations();
  }

  loadDesignations(): void {
    this.loadingDesignations = true;
    
    this.designationService.getDesignations().subscribe({
      next: (response) => {
        // Handle different response structures
        const designations = response.data || response || [];
        
        this.designations = designations.filter((d: any) => !d.isDeleted);
        
        // Convert to options format for the dropdown
        this.designationOptions = this.designations.map((designation: any) => {
          // Try different possible property names for the designation name
          const name = designation.name || 
                      designation.title || 
                      designation.designationName || 
                      designation.designation || 
                      designation.label ||
                      'Unknown';
          
          return {
            label: name,
            value: designation.id || designation.designationId || 0
          };
        });
        
        this.loadingDesignations = false;
      },
      error: (error) => {
        console.error('Error loading designations:', error);
        this.loadingDesignations = false;
        
        this.messageService.add({
          severity: 'error',
          summary: 'API Error',
          detail: 'Failed to load designations from API.'
        });
      }
    });
  }

  refreshDesignations(): void {
    this.loadDesignations();
  }


  onImageUpload(event: any): void {
    // Handle both PrimeNG FileUpload and direct file input events
    const file = event.files && event.files.length > 0 ? event.files[0] : 
                 event.target && event.target.files && event.target.files.length > 0 ? event.target.files[0] : null;
    
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // First detect face before setting the image
        const faceDetected = await this.detectAndStoreFaceDescriptor(base64);
        
        if (faceDetected) {
          // Only set image if face is detected
          this.selectedImage = base64;
          this.profileForm.patchValue({ image: base64 });
          this.profileForm.get('image')?.updateValueAndValidity();
          this.uploadedFileName = file.name;
        } else {
          // Clear image if no face detected
          this.selectedImage = null;
          this.profileForm.patchValue({ image: null });
          this.profileForm.get('image')?.updateValueAndValidity();
          this.uploadedFileName = null;
        }
      };
      reader.readAsDataURL(file);
    } else {
      this.profileForm.patchValue({ image: null });
      this.uploadedFileName = null;
      this.selectedImage = null;
    }
  }

  removeImage(): void {
    this.profileForm.patchValue({ image: null });
    this.profileForm.get('image')?.updateValueAndValidity();
    this.uploadedFileName = null;
    this.selectedImage = null;
    this.faceDescriptor = null;
    
    // Reset face detection state
    this.resetFaceDetectionState();
  }

  resetFaceDetectionState(): void {
    this.faceDescriptor = null;
    // Don't reset faceModelsLoaded as models should stay loaded
  }


  onImageClick(): void {
    this.showUploadDialog = true;
  }

  openUploadDialog(): void {
    this.showUploadDialog = true;
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
  }

  onFileSelect(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      this.onImageUpload(event);
      this.closeUploadDialog();
    };
    input.click();
  }

  openCamera(): void {
    this.closeUploadDialog();
    this.showCameraDialog = true;
    setTimeout(() => {
      this.startCamera();
    }, 100);
  }

  startCamera(): void {
    // Stop any existing stream first
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          this.stream = stream;
          if (this.videoRef && this.videoRef.nativeElement) {
            this.videoRef.nativeElement.srcObject = stream;
            this.videoRef.nativeElement.play();
            console.log('Camera started successfully');
          }
        })
        .catch((err) => {
          console.error('Camera error:', err);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Camera Error', 
            detail: 'Could not access the camera. Please allow camera access.' 
          });
          this.closeCamera();
        });
    } else {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Camera Error', 
        detail: 'Camera not supported in this browser.' 
      });
      this.closeCamera();
    }
  }

  async capturePhoto(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    const context = canvas.getContext('2d');
    if (context) {
      // Clear the canvas before drawing
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const base64 = canvas.toDataURL('image/png');
      
      // First detect face before setting the image
      const faceDetected = await this.detectAndStoreFaceDescriptor(base64);
      
      if (faceDetected) {
        // Only set image if face is detected
        this.selectedImage = base64;
        this.profileForm.patchValue({ image: base64 });
        this.profileForm.get('image')?.updateValueAndValidity();
        this.uploadedFileName = 'captured-photo.png';
      } else {
        // Clear image if no face detected
        this.selectedImage = null;
        this.profileForm.patchValue({ image: null });
        this.profileForm.get('image')?.updateValueAndValidity();
        this.uploadedFileName = null;
      }
      
      this.closeCamera();
    }
  }

  closeCamera(): void {
    this.showCameraDialog = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async loadFaceModels(): Promise<void> {
    if (!this.faceModelsLoaded) {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models/face-api/');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models/face-api/');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models/face-api/');
        this.faceModelsLoaded = true;
      } catch (error) {
        console.error('Error loading face models:', error);
        this.faceModelsLoaded = false; // Reset flag on error
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Model Loading Error', 
          detail: 'Failed to load face detection models.' 
        });
      }
    }
  }

  async detectFaceInImage(base64Image: string): Promise<Float32Array | null> {
    try {
      await this.loadFaceModels();
      
      // Create a new image element and ensure it's properly loaded
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Add CORS support
      
      return new Promise((resolve) => {
        img.onload = async () => {
          try {
            const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
            const detection = await faceapi
              .detectSingleFace(img, options)
              .withFaceLandmarks()
              .withFaceDescriptor();

            resolve(detection?.descriptor || null);
          } catch (error) {
            console.error('Face detection error in detectFaceInImage:', error);
            resolve(null);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image loading error:', error);
          resolve(null);
        };
        
        img.src = base64Image;
      });
    } catch (error) {
      console.error('Error in detectFaceInImage:', error);
      return null;
    }
  }

  async detectAndStoreFaceDescriptor(base64Image: string): Promise<boolean> {
    try {
      // Reset face descriptor before detection
      this.faceDescriptor = null;
      
      const descriptor = await this.detectFaceInImage(base64Image);
      
      if (descriptor) {
        this.faceDescriptor = descriptor;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Face Detected', 
          detail: 'Face detected successfully in the image.' 
        });
        return true;
      } else {
        this.faceDescriptor = null;
        this.messageService.add({ 
          severity: 'warn', 
          summary: 'No Face Detected', 
          detail: 'No face detected in the uploaded image. Please upload a clear photo with a visible face.' 
        });
        return false;
      }
    } catch (error) {
      console.error('Face detection error:', error);
      this.faceDescriptor = null;
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Face Detection Error', 
        detail: 'Error occurred during face detection.' 
      });
      return false;
    }
  }

  onBack(): void {
    // Navigate back or handle back action
  }

  onReset(): void {
    // Reset all form values to initial state
    this.profileForm.reset();
    
    // Reset image and face detection
    this.selectedImage = 'assets/images/default-profile.png';
    this.faceDescriptor = null;
    
    // Close any open dialogs
    this.showCameraDialog = false;
    this.showUploadDialog = false;
    
    // Stop camera stream if active
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Reset face detection state
    this.resetFaceDetectionState();
    
    // Show success message
    this.messageService.add({
      severity: 'info',
      summary: 'Form Reset',
      detail: 'All form fields have been cleared.'
    });
  }

  async onSave(): Promise<void> {
    if (this.profileForm.valid && !this.isSubmitting) {
      // Check authentication first
      if (!this.isAuthenticated()) {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Authentication Required', 
          detail: 'Please login to create employees.' 
        });
        return;
      }

      this.isSubmitting = true;
      const formData = this.profileForm.value;
      
      try {
        // Get company ID from admin token (you may need to decode JWT token)
        const companyId = this.getCompanyIdFromToken();
        
        // Convert face descriptor to array and ensure no newlines
        const faceDescriptorArray = this.faceDescriptor ? Array.from(this.faceDescriptor) : [];
        const faceId = faceDescriptorArray.length > 0 ? JSON.stringify(faceDescriptorArray).replace(/\n/g, '') : '';
        
        // Prepare employee data according to API structure
        const employeeData: Employee = {
          employeeId: formData.employeeId,
          companyId: companyId,
          employeeDesignationId: formData.designation,
          employeeFirstName: formData.firstName,
          employeeMiddleName: formData.middleName || null,
          employeeLastName: formData.lastName,
          employeeEmail: formData.email,
          employeeDob: formData.dob, // Date should be in YYYY-MM-DD format
          employeePhone: formData.phone,
          employeeFaceImage: formData.image,
          employeeFaceId: faceId,
          employeeLocationHome: formData.location,
          employeeIsActive: true
        };
        console.log(employeeData);
        
        
        
        // Call API to create employee
        this.employeeService.createEmployee(employeeData).subscribe({
          next: (response) => {
            this.isSubmitting = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Employee created successfully!' 
            });
            
            // Reset form after successful creation
            this.resetForm();
          },
          error: (error) => {
            this.isSubmitting = false;
            
            let errorMessage = 'Failed to create employee. Please try again.';
            let errorSummary = 'Error';
            
            // Handle specific error types
            if (error.status === 401) {
              errorSummary = 'Authentication Error';
              errorMessage = 'Your session has expired. Please login again.';
            } else if (error.status === 403) {
              errorSummary = 'Access Denied';
              errorMessage = 'You do not have permission to create employees.';
            } else if (error.status === 400) {
              errorSummary = 'Validation Error';
              errorMessage = 'Please check your input data and try again.';
            } else if (error.status === 500) {
              errorSummary = 'Server Error';
              errorMessage = 'Server error occurred. Please try again later.';
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            this.messageService.add({ 
              severity: 'error', 
              summary: errorSummary,
              detail: errorMessage
            });
          }
        });
        
      } catch (error) {
        this.isSubmitting = false;
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Error preparing employee data.' 
        });
      }
    } else if (this.isSubmitting) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Please Wait', 
        detail: 'Employee creation in progress...' 
      });
    } else {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation Error', 
        detail: 'Please fill in all required fields.' 
      });
      // Mark all fields as touched to show validation errors
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
    }
  }

  private isAuthenticated(): boolean {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        return false;
      }

      // Check if token is expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        // Remove expired token
        localStorage.removeItem('jwt_token');
        return false;
      }

      return true;
    } catch (error) {
      // Remove invalid token
      localStorage.removeItem('jwt_token');
      return false;
    }
  }

  private getCompanyIdFromToken(): number {
    try {
      // Get company ID from stored user data (same pattern as other components)
      const userData = localStorage.getItem('user_data');
      let companyId = 0; // Default fallback
      
      if (userData) {
        const user = JSON.parse(userData);
        companyId = user.companyId || 0;
      }
      
      return companyId;
    } catch (error) {
      // User data parsing failed
      return 0; // Default fallback
    }
  }

  private resetForm(): void {
    this.profileForm.reset();
    this.selectedImage = 'assets/images/default-profile.png';
    this.faceDescriptor = null;
    this.showCameraDialog = false;
    this.showUploadDialog = false;
    
    // Stop camera stream if active
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Reset face detection state
    this.resetFaceDetectionState();
  }

  getStepClass(step: number): string {
    if (step < this.currentStep) {
      return 'step-completed';
    } else if (step === this.currentStep) {
      return 'step-current';
    } else {
      return 'step-pending';
    }
  }
}