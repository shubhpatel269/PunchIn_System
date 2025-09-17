import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
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
import { PunchService } from '../../shared/services/punch.service';
import { SessionService } from '../../shared/services/session.service';
import { LocationLogService } from '../../shared/services/location-log.service';



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
  imports: [CommonModule, ButtonModule, ImageModule, CardModule, DividerModule, ToastModule, ConfirmPopupModule, FormsModule],
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
  private lastFaceDescriptor: number[] | null = null;
  private nextRoute: string[] | null = null;
  private activePunchId: number | null = null;
  detectedUser: string = "";
  faceDetectionInterval: any = null;


  navigatingToHome: boolean = false;
  navigationCountdown: number = 5;
  countdownInterval!: ReturnType<typeof setInterval>;


  showSignIn = false;
  showAdminLogin = true;
  activeTab: 'admin' | 'user' | 'none' = 'none';

  adminEmail: string = '';
  adminPassword: string = '';
  adminLoading: boolean = false;
  adminError: string = '';

  constructor(private router: Router,
    private messageService: MessageService,
    private employeeService: Employee,
    private confirmationService: ConfirmationService,
    private ngZone: NgZone,
    private authService: AuthService,
    private punchService: PunchService,
    private sessionService: SessionService,
    private locationLogService: LocationLogService
  ) { }

  login() {
    this.router.navigate(['/dashboard/home']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }

  switchToNoneTab() {
    if(this.activeTab == 'user'){
      this.stopVideo();
      }  
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
    localStorage.clear();
  }


  async ngAfterViewInit() {
    if (this.activeTab === 'user') {
      await this.initFaceRecognition();
    }
  }

  async initFaceRecognition() {
    try {
      // Initialize MediaPipe for blink detection
      await this.initializeMediaPipe();

      // Start the camera
      await this.startVideo();

      // Start the blink detection loop
      this.detectFaceWithBlink();
    } catch (error) {
      console.error('Error initializing face recognition:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Initialization Error',
        detail: 'Failed to initialize face recognition. Please refresh the page and try again.',
        life: 5000
      });
    }
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

  async startVideo(): Promise<void> {
    try {
      // Stop any existing video stream
      if (this.videoRef?.nativeElement?.srcObject) {
        const stream = this.videoRef.nativeElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user' // Use front camera
        }
      });
      this.videoRef.nativeElement.srcObject = stream;
      this.videoRef.nativeElement.play(); // Wait for video to be ready
      await new Promise<void>((resolve) => {
        this.videoRef.nativeElement.onloadedmetadata = () => {
          this.videoRef.nativeElement.play();
          resolve();
        };
      });

      this.camera_permission = true;
      return Promise.resolve();

    } catch (error) {
      console.error('Error accessing camera:', error);
      this.camera_permission = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Camera Access Required',
        detail: 'Please allow camera access to use face recognition',
        life: 5000
      });
      return Promise.reject(error);
    }
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
        try {

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
        } catch (error) {
          console.error('Error in face detection loop:', error);
          // Continue detection even if there's an error
        }
      }

      // Continue detection loop unless blinkVerified and recognition is complete
      if (!this.blinkVerified) {
        this.animationId = requestAnimationFrame(detectLoop);
      } else if (this.animationId) {
        // Clean up animation frame if we're done
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    };
    // Start the detection loop
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
      // Use face-api.js to get face descriptor
      const result = await faceapi.detectSingleFace(
        this.videoRef.nativeElement,
        options
      ).withFaceLandmarks().withFaceDescriptor();

      if (result) {
        // Convert Float32Array to regular array for JSON serialization
        const faceDescriptor = Array.from(result.descriptor);
        this.lastFaceDescriptor = faceDescriptor;
        
        // Send to backend for verification
        this.authService.faceLogin(faceDescriptor).subscribe({
          next: (response) => {
            // Get user data from response
            const user = response.user;
            const userName = `${user.employeeFirstName} ${user.employeeLastName}`;
            
            this.messageService.add({
              severity: 'success',
              summary: 'Verification Complete',
              detail: `Welcome ${userName}!`,
              life: 4000
            });

            this.detectedUser = `User: ${userName}`;
            this.detectedEmployee = user;
            
            // Capture snapshot BEFORE stopping video
            const imageData = this.captureSnapshot();
            
            // Stop all detection processes AFTER capturing snapshot
            this.stopVideo();
            
            // Process the captured snapshot and get location
            this.requestLocationAndSave(imageData);
          },
          error: (error) => {
            console.error('Face login failed:', error);
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
            if (this.activeTab === 'user') {
              this.animationId = requestAnimationFrame(this.detectFaceWithBlink.bind(this));
            }
          }
        });
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
        const timestamp: string = new Date().toISOString();

        // Store punch data
        const punch: Punch = {
          timestamp,
          image: imageData,
          location: {
            lat,
            long
          }
        };

        this.punchData.push(punch);
        // Store user details in localStorage and call PunchIn API
        if (this.detectedEmployee) {
          const userData = {
            name: `${this.detectedEmployee.employeeFirstName} ${this.detectedEmployee.employeeLastName}`,
            email: this.detectedEmployee.employeeEmail,
            employeeId: this.detectedEmployee.employeeId,
            companyId: this.detectedEmployee.companyId,
            location: lat && long ? `${lat}, ${long}` : '',
            punchedTime: new Date().toLocaleString(),
            mobile: this.detectedEmployee.employeePhone
          };

          // Save user data to localStorage
          localStorage.setItem('punchInUser', JSON.stringify(userData));

          // Prepare punch payload
          const punchPayload = {
            employeeId: this.detectedEmployee.employeeId,
            punchTimestamp: timestamp,
            punchFaceUrl: imageData,
            punchFaceId: JSON.stringify(this.lastFaceDescriptor || []),
            punchLocationLong: long || 0,
            punchLocationLat: lat || 0
          };

          // Call PunchIn API; on success start session, then start countdown
          this.punchService.punchIn(punchPayload).subscribe({
            next: (punchResponse) => {
              const punchId = punchResponse?.punchId ?? punchResponse?.id ?? 0;
              this.activePunchId = punchId || null;
              if (this.activePunchId) {
                localStorage.setItem('activePunchId', String(this.activePunchId));
              }
              if (!punchId) {
                console.warn('PunchIn response missing punchId. Response:', punchResponse);
              }

              const sessionPayload = {
                punchId: punchId,
                employeeId: this.detectedEmployee.employeeId,
                sessionStatus: 'active',
                sessionStartTime: new Date().toISOString(),
                sessionEndTime: null,
                sessionLocationLong: long || 0,
                sessionLocationLat: lat || 0,
                sessionBreakTime: null
              };

              this.sessionService.startSession(sessionPayload).subscribe({
                next: (sessionResponse) => {
                  const sessionId = sessionResponse?.sessionId ?? sessionResponse?.id ?? null;
                  if (sessionId) {
                    localStorage.setItem('activeSessionId', String(sessionId));
                  }
          this.messageService.add({
            severity: 'success',
            summary: 'Punch-In Successful',
                    detail: `Welcome ${userData.name}!`,
                    life: 3000
          });
          this.startSession();
                  // set next route and start countdown (do not navigate immediately)
                  this.nextRoute = ['/employee/dashboard'];
                  this.startNavigationCountdown();
                },
                error: (err) => {
                  console.error('Session start API failed:', err);
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Session Start Failed',
                    detail: 'Could not start your work session. Please try again.',
                    life: 4000
                  });
                }
              });
            },
            error: (err) => {
              console.error('PunchIn API failed:', err);
              this.messageService.add({
                severity: 'error',
                summary: 'Punch-In Failed',
                detail: 'Could not record punch. Please try again.',
                life: 4000
              });
            }
          });
        }
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
          // Use nextRoute if provided; otherwise fallback to role-based navigation
          if (this.nextRoute) {
            const route = this.nextRoute;
            this.nextRoute = null;
            this.router.navigate(route);
            return;
          }
          const userRole = localStorage.getItem('user_role');
          if (userRole === 'Admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/employee/dashboard']);
          }
        });
      }
    };

    this.timerRequestId = requestAnimationFrame(updateTimer);
  }



  stopVideo(): void {
    try {
      // Cancel any pending animation frames
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }

      // Clear any pending timeouts
      if (this.recognitionTimer) {
        clearTimeout(this.recognitionTimer);
        this.recognitionTimer = null;
      }

      // Clear face detection interval if it exists
      if (this.faceDetectionInterval) {
        clearInterval(this.faceDetectionInterval);
        this.faceDetectionInterval = null;
      }

      // Stop camera stream if it exists
      if (this.videoRef?.nativeElement?.srcObject) {
        try {
          const stream = this.videoRef.nativeElement.srcObject as MediaStream;
          if (stream) {
            // Stop all tracks in the stream
            stream.getTracks().forEach(track => {
              track.stop();
              stream.removeTrack(track);
            });
          }
          
          // Clear the video source
          this.videoRef.nativeElement.srcObject = null;
          this.videoRef.nativeElement.pause();
        } catch (e) {
          console.warn('Error while stopping video tracks:', e);
        }
      }
      
      // Reset video element
      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.removeAttribute('src');
        this.videoRef.nativeElement.load();
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

        try {
          const sessionIdStr = localStorage.getItem('activeSessionId');
          const sessionId = sessionIdStr ? parseInt(sessionIdStr, 10) : null;
          const employeeId = this.detectedEmployee?.employeeId || JSON.parse(localStorage.getItem('punchInUser') || '{}')?.employeeId;
          if (sessionId && employeeId) {
            const payload = {
              sessionId: sessionId,
              employeeId: employeeId,
              logTimestamp: new Date().toISOString(),
              locationLong: log.long,
              locationLat: log.lat
            };
            this.locationLogService.createLog(payload).subscribe({
              next: () => {
                // Optional: silent success
              },
              error: (err) => {
                console.warn('Failed to send location log:', err);
              }
            });
          }
        } catch (e) {
          console.warn('Location log payload build failed:', e);
        }
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
    this.adminLoading = true;
    this.adminError = '';
    this.authService.login({ email: this.adminEmail, password: this.adminPassword }).subscribe({
      next: (res) => {
        this.adminLoading = false;
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.adminLoading = false;
        this.adminError = err?.error?.message || 'Login failed. Please check your credentials.';
        this.messageService.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: this.adminError,
          life: 4000
        });
      }
    });
  }

    ngOnDestroy() {
    // Clear all timeouts and intervals
    if (this.recognitionTimer) {
      clearTimeout(this.recognitionTimer);
      this.recognitionTimer = null;
    }

    // Cancel any pending animation frames
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Clear face detection interval
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
      this.faceDetectionInterval = null;
    }
    
    // // Clear location tracking interval
    // if (this.locationInterval) {
    //   clearInterval(this.locationInterval);
    //   this.locationInterval = null;
    // }

    // // Clear session timer
    // if (this.sessionTimer) {
    //   clearTimeout(this.sessionTimer);
    //   this.sessionTimer = null;
    // }

    // Clear timer request ID
    if (this.timerRequestId) {
      cancelAnimationFrame(this.timerRequestId);
      this.timerRequestId = null;
    }

    // Stop any active video streams
    this.stopVideo();

    // Clean up web worker if it exists
    if (this.timerWorker) {
      try {
        this.timerWorker.postMessage('stop');
        this.timerWorker.terminate();
      } catch (e) {
        console.warn('Error terminating timer worker:', e);
      } finally {
        this.timerWorker = undefined;
      }
    }

    // Reset all component state
    this.isFaceDetected = false;
    this.blinkVerified = false;
    this.showBlinkInstruction = false;
    this.detectedEmployee = null;
    this.detectedUser = '';
  }
}