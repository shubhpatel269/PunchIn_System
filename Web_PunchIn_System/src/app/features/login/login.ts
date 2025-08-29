import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy,NgZone } from '@angular/core';
import { Router } from '@angular/router';
import * as faceapi from 'face-api.js';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ImageModule } from 'primeng/image';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Employee } from '../../shared/services/employee';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { AuthService } from '../../shared/services/auth.service';



interface Punch {
  timestamp: string;
  image: string;
  location: {
    lat: number | null;
    long: number | null;
  };
}

interface LocationLog {
  timestamp: string;
  lat: number;
  long: number;
}

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ButtonModule, ImageModule, CardModule, DividerModule, ToastModule, ConfirmPopupModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  punchData: Punch[] = [];
  latitude: number | null = null;
  longitude: number | null = null;
  isFaceDetected: boolean = false;
  camera_permission: boolean = true;
  location_permission: boolean = true;
  timerWorker: Worker | undefined;

  private faceLandmarker: FaceLandmarker | null = null;
  private animationId: number | null = null;

  // Add blink detection variables
  blinkVerified: boolean = false;
  private eyeClosedFrames: number = 0;
  private readonly EYE_CLOSED_THRESHOLD = 0.25;
  private readonly BLINK_FRAME_THRESHOLD = 3;
  private lastBlinkTime: number = 0;
  showBlinkInstruction: boolean = false;
  private recognitionTimer: any = null;

  private startTime: number = 0;
  private timerRequestId: number | null = null;


  sessionActive: boolean = false;
  sessionStartTime!: Date;
  sessionTimer!: ReturnType<typeof setTimeout>;
  locationInterval!: ReturnType<typeof setInterval>;
  locationLogs: LocationLog[] = [];

  employees: any[] = [];
  employeeDescriptors: { id: number, name: string, descriptor: Float32Array }[] = [];
  isLoadingDescriptors: boolean = true;
  detectedEmployee: any = null;
  lastFaceNotRecognizedTime: number = 0;
  detectedUser: string = "";
  faceDetectionInterval: any = null;


  navigatingToHome: boolean = false;
  navigationCountdown: number = 5;
  countdownInterval!: ReturnType<typeof setInterval>;


  showSignIn = false;
  showAdminLogin = true;
  activeTab: 'admin' | 'user' | 'none' = 'none';


  constructor(private router: Router,
    private messageService: MessageService,
    private employeeService: Employee,
    private confirmationService: ConfirmationService,
    private ngZone: NgZone
  ) { }

  login() {
    this.router.navigate(['/dashboard/home']);
  }

  switchToNoneTab() {
    this.activeTab = 'none';
    this.showAdminLogin = false;
    this.showSignIn = false;
    if (this.isFaceDetected) {
      return;
    }
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.stopVideo();
    this.isFaceDetected = false;
    this.blinkVerified = false;
    this.showBlinkInstruction = false;
    this.detectedEmployee = null;
    this.detectedUser = "";
    this.navigatingToHome = false;
    this.navigationCountdown = 5;
  }

  switchToAdminTab() {
    if (this.isFaceDetected) {
      return;
    }
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.stopVideo();
    this.activeTab = 'admin';
    this.showAdminLogin = true;
    this.showSignIn = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.navigatingToHome = false;
    this.navigationCountdown = 5;
    this.isFaceDetected = false;
    this.blinkVerified = false;
    this.showBlinkInstruction = false;
    this.detectedEmployee = null;
    this.detectedUser = "";
  }

  switchToUserTab() {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.activeTab = 'user';
    this.showAdminLogin = false;
    this.showSignIn = false;

    this.isFaceDetected = false;
    this.blinkVerified = false;
    this.showBlinkInstruction = false;
    this.detectedEmployee = null;
    this.punchData = [];
    this.navigatingToHome = false;
    this.navigationCountdown = 5;
    this.detectedUser = "";

    setTimeout(() => {
      this.initFaceRecognition();
    }, 100);
  }

  async ngOnInit() {
    await this.loadModels();
    await this.loadEmployeeDescriptors();
  }


  async ngAfterViewInit() {
    if (this.activeTab === 'user') {
      await this.initFaceRecognition();
    }
  }

  async initFaceRecognition() {
    await this.loadModels();
    await this.initializeMediaPipe();

    await this.loadEmployeeDescriptors();
    this.startVideo();
  }
  async initializeMediaPipe() {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
    } catch (error) {
      console.error('Error initializing MediaPipe:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to initialize face detection. Please refresh the page.',
        life: 5000
      });
    }
  }

  async loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models/face-api/');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models/face-api/');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models/face-api/');
  }

  async loadEmployeeDescriptors() {
    this.isLoadingDescriptors = true;
    this.employeeDescriptors = []; // Reset any existing descriptors

    try {
      // Get employees with their face descriptors
      this.employees = await new Promise<any[]>((resolve, reject) => {
        this.employeeService.getEmployeesWithFaceDescriptors().subscribe({
          next: resolve,
          error: reject
        });
      });

      console.log('Raw employee data:', this.employees);

      // Process each employee's descriptor
      for (const emp of this.employees) {
        try {
          if (!emp.faceDescriptor) {
            console.warn(`No face descriptor found for employee ${emp.name} (${emp.id})`);
            continue;
          }

          let descriptor: Float32Array;
          
          if (Array.isArray(emp.faceDescriptor)) {
            // If it's already an array, convert to Float32Array
            descriptor = new Float32Array(emp.faceDescriptor);
          } else if (typeof emp.faceDescriptor === 'string') {
            try {
              // Try to parse as JSON array string
              const parsed = JSON.parse(emp.faceDescriptor);
              if (Array.isArray(parsed)) {
                descriptor = new Float32Array(parsed);
              } else {
                throw new Error('Descriptor is not an array');
              }
            } catch (e) {
              console.warn(`Invalid descriptor format for employee ${emp.name} (${emp.id})`, e);
              continue;
            }
          } else {
            console.warn(`Unsupported descriptor format for employee ${emp.name} (${emp.id})`);
            continue;
          }

          if (descriptor.length !== 128) {
            console.warn(`Invalid descriptor length (${descriptor.length}) for employee ${emp.name} (${emp.id})`);
            continue;
          }

          this.employeeDescriptors.push({
            id: emp.id,
            name: emp.name,
            descriptor: descriptor
          });
          
          console.log(`Successfully loaded descriptor for ${emp.name} (${emp.id})`);
        } catch (error) {
          console.error(`Error processing employee ${emp.name} (${emp.id}):`, error);
        }
      }
      
      console.log('Loaded employee descriptors:', this.employeeDescriptors);
    } catch (error) {
      console.error('Error loading employee descriptors:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load employee face data',
        life: 5000
      });
    } finally {
      this.isLoadingDescriptors = false;
    }
  }


  startVideo() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        this.videoRef.nativeElement.srcObject = stream;
        this.videoRef.nativeElement.play();

        // Wait for video to be loaded before starting detection
        this.videoRef.nativeElement.addEventListener('loadeddata', () => {
          // Start MediaPipe detection for blink verification
          this.detectFaceWithBlink();
        });
      })
      .catch((err) => {
        this.camera_permission = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'WebCam permission denied',
          life: 4000
        });
      });
  }

  detectFaceWithBlink() {
    if (!this.faceLandmarker || !this.videoRef.nativeElement) return;

    // Store non-null reference
    const faceLandmarker = this.faceLandmarker;

    const detectLoop = async (timestamp: number) => {
      if (this.activeTab !== 'user') {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
        return;
      }

      const video = this.videoRef.nativeElement;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Use the local variable that TypeScript knows is not null
        const results = await faceLandmarker.detectForVideo(video, timestamp);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          this.isFaceDetected = true;

          if (!this.showBlinkInstruction && !this.blinkVerified) {
            this.showBlinkInstruction = true;
          }

          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const blinkDetected = this.checkForBlink(results.faceBlendshapes[0].categories);

            if (blinkDetected && !this.blinkVerified) {
              // First, indicate blink was detected
              this.blinkVerified = true;
              this.showBlinkInstruction = false;

              this.messageService.add({
                severity: 'info',
                summary: 'Blink Detected',
                detail: 'Please keep looking at the camera...',
                life: 2000
              });

              // Clear any existing timer
              if (this.recognitionTimer) {
                clearTimeout(this.recognitionTimer);
              }

              // Wait 1.5 seconds before face recognition to ensure eyes are open
              this.recognitionTimer = setTimeout(() => {
                this.performFaceRecognition();
              }, 1500);
            }
          }
        } else {
          this.isFaceDetected = false;
          this.showBlinkInstruction = false;
        }
      }

      // Continue detection loop unless blinkVerified and recognition is complete
      if (!this.blinkVerified) {
        this.animationId = requestAnimationFrame(detectLoop);
      }
    };

    this.animationId = requestAnimationFrame(detectLoop);
  }

  checkForBlink(blendshapes: any[]): boolean {
    const leftEyeBlink = blendshapes.find(shape => shape.categoryName === 'eyeBlinkLeft');
    const rightEyeBlink = blendshapes.find(shape => shape.categoryName === 'eyeBlinkRight');

    if (leftEyeBlink && rightEyeBlink) {
      const avgBlink = (leftEyeBlink.score + rightEyeBlink.score) / 2;

      if (avgBlink > this.EYE_CLOSED_THRESHOLD) {
        this.eyeClosedFrames++;
      } else {
        if (this.eyeClosedFrames >= this.BLINK_FRAME_THRESHOLD) {
          const currentTime = Date.now();
          if (currentTime - this.lastBlinkTime > 500) { // Debounce blinks
            this.lastBlinkTime = currentTime;
            this.eyeClosedFrames = 0;
            return true; // Blink detected
          }
        }
        this.eyeClosedFrames = 0;
      }
    }
    return false;
  }

  async performFaceRecognition() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    try {
      // Use face-api.js for recognition
      const result = await faceapi.detectSingleFace(
        this.videoRef.nativeElement,
        options
      ).withFaceLandmarks().withFaceDescriptor();

      if (result) {
        const bestMatch = this.findBestMatch(result.descriptor);

        if (bestMatch) {
          // We found a matching employee
          this.detectedEmployee = bestMatch;
          const imageData = this.captureSnapshot();

          // Stop all detection processes
          this.stopVideo();

          this.messageService.add({
            severity: 'success',
            summary: 'Verification Complete',
            detail: `Welcome ${bestMatch.name}!`,
            life: 4000
          });

          this.detectedUser = `User: ${bestMatch.name}`;
          this.requestLocationAndSave(imageData);
        } else {
          // Face detected but no match in database
          this.messageService.add({
            severity: 'warn',
            summary: 'Face Not Recognized',
            detail: 'Your face does not match any employee record.',
            life: 4000
          });
          // Reset blink verification to try again
          this.blinkVerified = false;
          this.showBlinkInstruction = true;

          // Continue detection
          if (!this.animationId && this.activeTab === 'user') {
            this.animationId = requestAnimationFrame(this.detectFaceWithBlink.bind(this));
          }
        }
      } else {
        // No face detected during recognition
        this.messageService.add({
          severity: 'warn',
          summary: 'Face Detection Failed',
          detail: 'Please look directly at the camera.',
          life: 3000
        });
        // Reset and try again
        this.blinkVerified = false;
        this.showBlinkInstruction = true;
      }
    } catch (error) {
      console.error('Error in face recognition:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Recognition Error',
        detail: 'An error occurred during face recognition.',
        life: 4000
      });
      this.blinkVerified = false;
    }
  }

  async detectFace() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

    // Clear any existing interval before starting a new one
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
    }

    this.faceDetectionInterval = setInterval(async () => {
      // Check if video element exists and we're still on user tab
      if (!this.videoRef || !this.videoRef.nativeElement || this.activeTab !== 'user') {
        clearInterval(this.faceDetectionInterval);
        this.faceDetectionInterval = null;
        return;
      }

      try {
        const result = await faceapi.detectSingleFace(
          this.videoRef.nativeElement,
          options
        ).withFaceLandmarks().withFaceDescriptor();

        if (result && !this.isFaceDetected) {
          const bestMatch = this.findBestMatch(result.descriptor);

          if (bestMatch) {
            this.isFaceDetected = true;
            this.detectedEmployee = bestMatch;
            clearInterval(this.faceDetectionInterval);
            this.faceDetectionInterval = null;
            const imageData = this.captureSnapshot();
            this.requestLocationAndSave(imageData);
            this.stopVideo();
            this.messageService.add({
              severity: 'success',
              summary: 'Face Detected',
              detail: `Name: ${bestMatch.name}!`,
              life: 4000
            });
            this.detectedUser = `User: ${bestMatch.name}`
          } else {
            this.isFaceDetected = false;
            this.detectedEmployee = null;

            const now = Date.now();
            if (now - this.lastFaceNotRecognizedTime > 10000) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Face Not Recognized',
                detail: 'Your face does not match any employee record.',
                life: 4000
              });
              this.lastFaceNotRecognizedTime = now;
            }
          }
        } else if (!result) {
          // No face detected
          this.isFaceDetected = false;
          this.detectedEmployee = null;
        }
      } catch (error) {
        console.error('Error in face detection:', error);
        // Clear interval on error
        clearInterval(this.faceDetectionInterval);
        this.faceDetectionInterval = null;
      }
    }, 1000);
  }

  // Find best matching face from database using face descriptor
  findBestMatch(queryDescriptor: Float32Array) {
    if (!queryDescriptor || queryDescriptor.length === 0) {
      console.error('Invalid query descriptor');
      return null;
    }

    console.log('Starting face matching with', this.employeeDescriptors.length, 'stored descriptors');
  
    let minDistance = 0.6; // Increased threshold to be more permissive
    let bestMatch = null;
  
    for (const emp of this.employeeDescriptors) {
      try {
        if (!emp.descriptor || !(emp.descriptor instanceof Float32Array)) {
          console.warn('Invalid descriptor for employee:', emp.name);
          continue;
        }
        
        const distance = faceapi.euclideanDistance(emp.descriptor, queryDescriptor);
        console.log(`Distance to ${emp.name} (ID: ${emp.id}):`, distance);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = emp;
          console.log(`New best match found: ${emp.name} with distance ${distance}`);
        }
      } catch (error) {
        console.error(`Error comparing with employee ${emp.name}:`, error);
      }
    }
  
    console.log('Best match:', bestMatch ? `${bestMatch.name} (distance: ${minDistance})` : 'No match found');
    return bestMatch;
  }

  // capture image from video 
  captureSnapshot(): string {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    const video = this.videoRef.nativeElement;

    if (ctx) {

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg');
      console.log('Snapshot taken');
      return imageData;
    }

    return '';
  }

  requestLocationAndSave(imageData: string) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        const lat: number = this.latitude;
        const long: number = this.longitude;
        const timestamp: string = new Date().toLocaleString();

        const punch: Punch = {
          timestamp,
          image: imageData,
          location: {
            lat,
            long
          }
        };

        this.punchData.push(punch);
        this.messageService.add({
          severity: 'success',
          summary: 'Punch-In Successful',
          detail: `You punched in at ${timestamp}`,
          life: 4000
        });

        // store user details in localStorage
        if (this.detectedEmployee) {
          const emp = this.employees.find(e => e.id === this.detectedEmployee.id || e.employeeId === this.detectedEmployee.id);
          if (emp) {
            const userData = {
              name: emp.name,
              email: emp.email,
              mobile: emp.phone || emp.mobile,
              employeeId: emp.employeeId || emp.id,
              location: lat && long ? `${lat}, ${long}` : '',
              punchedTime: timestamp
            };

            // Save user data to localStorage
            localStorage.setItem('punchInUser', JSON.stringify(userData));
          }
        }
        // this.navigatingToHome = true;
        // this.navigationCountdown = 5;

        // this.countdownInterval = setInterval(() => {
        //   this.navigationCountdown--;
        //   if (this.navigationCountdown <= 0) {
        //     clearInterval(this.countdownInterval);
        //     this.router.navigate(['/home']);
        //   }
        // }, 1000);
        this.startNavigationCountdown();

        this.startSession();
      },
      (error) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: `Location permission denied`,
          life: 4000
        });
        this.location_permission = false;
      }
    );
  }

  startNavigationCountdown() {
    this.navigatingToHome = true;
    this.navigationCountdown = 5;
    this.startTime = Date.now();

    if (this.timerRequestId !== null) {
      cancelAnimationFrame(this.timerRequestId);
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      // Run inside Angular's zone to trigger change detection
      this.ngZone.run(() => {
        this.navigationCountdown = Math.max(5 - elapsed, 0);
      });

      if (this.navigationCountdown > 0) {
        this.timerRequestId = requestAnimationFrame(updateTimer);
      } else {
        this.timerRequestId = null;
        this.ngZone.run(() => {
          this.router.navigate(['/home']);
        });
      }
    };

    this.timerRequestId = requestAnimationFrame(updateTimer);
  }


  stopVideo() {
    try {
      // Cancel MediaPipe animation frame
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      // Clear face-api interval
      if (this.faceDetectionInterval) {
        clearInterval(this.faceDetectionInterval);
        this.faceDetectionInterval = null;
      }

      // Stop camera
      if (this.videoRef && this.videoRef.nativeElement) {
        const stream = this.videoRef.nativeElement.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          this.videoRef.nativeElement.srcObject = null;
        }
      }
    } catch (error) {
      console.error('Error stopping video:', error);
    }
  }


  startSession() {
    this.sessionActive = true;
    this.sessionStartTime = new Date();

    // Log when setInterval is scheduled
    const intervalScheduledAt = performance.now();
    console.log('setInterval scheduled at:', intervalScheduledAt);

    this.locationInterval = setInterval(() => {
      const intervalCallbackAt = performance.now();
      console.log(
        'setInterval callback at:', intervalCallbackAt,
        '| Delay since scheduled:', (intervalCallbackAt - intervalScheduledAt).toFixed(2), 'ms'
      );
      this.trackUserLocation();
    }, 10 * 1000); // 10 sec for fast check

    // Log when setTimeout is scheduled
    const timeoutScheduledAt = performance.now();
    console.log('setTimeout scheduled at:', timeoutScheduledAt);

    this.sessionTimer = setTimeout(() => {
      const timeoutCallbackAt = performance.now();
      console.log(
        'setTimeout callback at:', timeoutCallbackAt,
        '| Delay since scheduled:', (timeoutCallbackAt - timeoutScheduledAt).toFixed(2), 'ms'
      );
      this.endSession();
    }, 60 * 60 * 1000); // 1 hour

    console.log("WFH session tracking started.");
  }

  trackUserLocation() {


    navigator.geolocation.getCurrentPosition(
      (position) => {
        const log: LocationLog = {
          timestamp: new Date().toLocaleString(),
          lat: position.coords.latitude,
          long: position.coords.longitude
        };
        this.locationLogs.push(log);
        console.log(" Location logged:", log);

        this.messageService.add({
          severity: 'info',
          summary: 'Location Tracked',
          detail: `Lat: ${log.lat}, Long: ${log.long}`,
          life: 3000
        });
      },
      (error) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Location Tracking Error',
          detail: 'Unable to access location.',
          life: 3000
        });
      }
    );
  }

  endSession() {
    if (this.timerWorker) {
      this.timerWorker.postMessage('stop');
      this.timerWorker.terminate();
      this.timerWorker = undefined;
    }
    clearInterval(this.locationInterval);
    // clearTimeout(this.sessionTimer);
    this.sessionActive = false;

    this.messageService.add({
      severity: 'info',
      summary: 'Session Ended',
      detail: 'Your 4-hour session has ended automatically.',
      life: 4000
    });

  }

  adminLogin() {
    this.router.navigate(['/admin']);
  }

  ngOnDestroy() {
    if (this.recognitionTimer) {
      clearTimeout(this.recognitionTimer);
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
    }
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.stopVideo();
    if (this.timerWorker) {
      this.timerWorker.postMessage('stop');
      this.timerWorker.terminate();
      this.timerWorker = undefined;
    }
  }
}