import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ImageModule } from 'primeng/image';
import * as L from 'leaflet';
import { EmployeePunchInService, EmployeePunchInData, PunchInDetail } from '../../shared/services/employee-punchin.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-employee-punchin',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ButtonModule, 
    CardModule, 
    SkeletonModule, 
    Toast,
    ImageModule
  ],
  templateUrl: './employee-punchin.html',
  styleUrl: './employee-punchin.css',
  providers: [MessageService]
})
export class EmployeePunchInComponent implements OnInit, OnDestroy, AfterViewInit {
  employeeId: string = '';
  employeePunchInData: EmployeePunchInData | null = null;
  loading = false;
  skeletonRows: any[] = Array(5).fill({});
  
  // Map properties
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  mapCenter: [number, number] = [0, 0];
  mapZoom = 10;
  
  private destroy$ = new Subject<void>();

  constructor(
    private employeePunchInService: EmployeePunchInService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Get employee ID from route parameters (admin context only)
    this.route.params.subscribe(params => {
      this.employeeId = params['id'];
      if (this.employeeId) {
        this.loadEmployeePunchIns();
      }
    });
  }

  ngAfterViewInit() {
    // Initialize map after view is ready
    if (this.employeePunchInData) {
      setTimeout(() => this.initializeMap(), 100);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    // Always go back to manage employee (admin context only)
    this.router.navigate(['/admin/manage-employee']);
  }

  loadEmployeePunchIns() {
    if (!this.employeeId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee ID is required'
      });
      return;
    }

    this.loading = true;
    this.employeePunchInService.getEmployeePunchIns(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.employeePunchInData = data;
          this.loading = false;
          // Initialize map after a short delay to ensure DOM is ready
          setTimeout(() => this.initializeMap(), 200);
        },
        error: (error) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load employee punch-in data'
          });
          console.error('Error loading employee punch-ins:', error);
        }
      });
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  formatLocation(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  openLocationInMaps(lat: number | null, lng: number | null): void {
    if (lat === null || lng === null) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Location Unavailable',
        detail: 'Location coordinates are not available for this punch-in record.'
      });
      return;
    }

    // Create Google Maps URL with the coordinates
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
    
    // Open in new tab
    window.open(mapsUrl, '_blank');
  }

  initializeMap(): void {
    if (!this.employeePunchInData || !this.employeePunchInData.punchIns.length || !this.mapContainer) {
      return;
    }

    // Filter punch-ins with valid coordinates
    const validPunchIns = this.employeePunchInData.punchIns.filter(
      punchIn => punchIn.punchLocationLat !== null && punchIn.punchLocationLong !== null
    );

    if (validPunchIns.length === 0) {
      return;
    }

    // Calculate center point and zoom level
    this.calculateMapCenterAndZoom(validPunchIns);

    // Initialize Leaflet map
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(this.mapContainer.nativeElement).setView(this.mapCenter, this.mapZoom);

    // Add OpenStreetMap tiles (completely free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    // Available Pin Styles - Choose your preferred option:
    const createCustomIcon = (punchId: number, style: string = 'teardrop') => {
      let iconHtml = '';
      let iconSize: [number, number] = [30, 40];
      let iconAnchor: [number, number] = [15, 40];

      switch (style) {
        case 'teardrop': // Classic Google Maps style pin
          iconHtml = `
            <div style="position: relative; width: 30px; height: 40px;">
              <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" 
                      fill="#dc3545" stroke="#ffffff" stroke-width="2"/>
                <circle cx="15" cy="15" r="8" fill="#ffffff"/>
                <text x="15" y="19" text-anchor="middle" fill="#dc3545" font-size="10" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconAnchor = [15, 40];
          break;

        case 'square':
          iconHtml = `
            <div style="
              background: linear-gradient(135deg, #dc3545, #c82333);
              border: 2px solid white;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 11px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              border-radius: 4px;
            ">${punchId}</div>
          `;
          iconSize = [28, 28];
          iconAnchor = [14, 14];
          break;

        case 'hexagon':
          iconHtml = `
            <div style="position: relative; width: 32px; height: 32px;">
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,2 26,8 26,24 16,30 6,24 6,8" 
                         fill="#dc3545" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="11" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconSize = [32, 32];
          iconAnchor = [16, 16];
          break;

        case 'diamond':
          iconHtml = `
            <div style="position: relative; width: 30px; height: 30px;">
              <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="15" width="14" height="14" 
                      fill="#dc3545" stroke="#ffffff" stroke-width="2" 
                      transform="rotate(45 15 15)"/>
                <text x="15" y="19" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconSize = [30, 30];
          iconAnchor = [15, 15];
          break;

        case 'shield':
          iconHtml = `
            <div style="position: relative; width: 28px; height: 35px;">
              <svg width="28" height="35" viewBox="0 0 28 35" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 0L2 6v10c0 7.5 5.2 14.6 12 16.5 6.8-1.9 12-9 12-16.5V6L14 0z" 
                      fill="#dc3545" stroke="#ffffff" stroke-width="2"/>
                <text x="14" y="18" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconSize = [28, 35];
          iconAnchor = [14, 35];
          break;

        case 'star':
          iconHtml = `
            <div style="position: relative; width: 32px; height: 32px;">
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2l4.12 8.36L29 12.28l-6.5 6.34L24 27l-8-4.21L8 27l1.5-8.38L3 12.28l8.88-1.92L16 2z" 
                      fill="#dc3545" stroke="#ffffff" stroke-width="2"/>
                <text x="16" y="19" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconSize = [32, 32];
          iconAnchor = [16, 16];
          break;

        case 'flag':
          iconHtml = `
            <div style="position: relative; width: 30px; height: 35px;">
              <svg width="30" height="35" viewBox="0 0 30 35" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="0" width="2" height="35" fill="#666"/>
                <path d="M4 2h20c2 0 2 2 0 4H4v8h16c2 0 2 2 0 4H4z" 
                      fill="#dc3545" stroke="#ffffff" stroke-width="1"/>
                <text x="14" y="11" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${punchId}</text>
              </svg>
            </div>
          `;
          iconSize = [30, 35];
          iconAnchor = [4, 35];
          break;

        case 'circle': // Original circle design
        default:
          iconHtml = `
            <div style="
              background-color: #dc3545;
              border: 2px solid white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${punchId}</div>
          `;
          iconSize = [32, 32];
          iconAnchor = [16, 16];
          break;
      }
      
      return L.divIcon({
        html: iconHtml,
        className: 'custom-punch-marker',
        iconSize: iconSize,
        iconAnchor: iconAnchor
      });
    };

    // Choose your preferred style here:
    const selectedStyle = 'teardrop'; // Options: 'teardrop', 'square', 'hexagon', 'diamond', 'shield', 'star', 'flag', 'circle'

    // Add markers for each punch-in location
    validPunchIns.forEach((punchIn, index) => {
      const marker = L.marker([punchIn.punchLocationLat!, punchIn.punchLocationLong!], {
        icon: createCustomIcon(punchIn.punchId, selectedStyle)
      }).addTo(this.map!);

      // Add popup with punch-in details
      const popupContent = `
        <div style="font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #dc3545;">Punch ID: ${punchIn.punchId}</h4>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${this.formatDate(punchIn.punchTimestamp)}</p>
          <p style="margin: 4px 0;"><strong>Location:</strong> ${this.formatLocation(punchIn.punchLocationLat!, punchIn.punchLocationLong!)}</p>
        </div>
      `;
      
        marker.bindPopup(popupContent);
        
        // Add click interaction to highlight corresponding table row
        marker.on('click', () => {
          this.highlightTableRow(punchIn.punchId);
        });
        
        this.markers.push(marker);
    });

    // Fit map to show all markers if multiple locations
    if (validPunchIns.length > 1) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  calculateMapCenterAndZoom(punchIns: PunchInDetail[]): void {
    if (punchIns.length === 1) {
      // Single location - center on it
      this.mapCenter = [punchIns[0].punchLocationLat!, punchIns[0].punchLocationLong!];
      this.mapZoom = 15;
    } else {
      // Multiple locations - calculate bounds
      let minLat = punchIns[0].punchLocationLat!;
      let maxLat = punchIns[0].punchLocationLat!;
      let minLng = punchIns[0].punchLocationLong!;
      let maxLng = punchIns[0].punchLocationLong!;

      punchIns.forEach(punchIn => {
        const lat = punchIn.punchLocationLat!;
        const lng = punchIn.punchLocationLong!;
        
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });

      // Center point
      this.mapCenter = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];

      // Calculate zoom level based on bounds
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      if (maxDiff < 0.01) {
        this.mapZoom = 15;
      } else if (maxDiff < 0.05) {
        this.mapZoom = 13;
      } else if (maxDiff < 0.1) {
        this.mapZoom = 11;
      } else if (maxDiff < 0.5) {
        this.mapZoom = 9;
      } else {
        this.mapZoom = 7;
      }
    }
  }

  getEmployeeFullName(): string {
    if (!this.employeePunchInData) return '';
    
    const { employeeFirstName, employeeMiddleName, employeeLastName } = this.employeePunchInData;
    return [employeeFirstName, employeeMiddleName, employeeLastName]
      .filter(name => name && name.trim())
      .join(' ');
  }

  getEmployeeFaceImageSrc(): string {
    if (!this.employeePunchInData?.employeeFaceImage) {
      return 'assets/images/default-avatar.png'; // You can add a default avatar image
    }
    
    // Check if it's a base64 image or a URL
    if (this.employeePunchInData.employeeFaceImage.startsWith('data:image')) {
      return this.employeePunchInData.employeeFaceImage;
    }
    
    return this.employeePunchInData.employeeFaceImage;
  }

  getPunchFaceImageSrc(punchFaceUrl: string): string {
    if (!punchFaceUrl) {
      return 'assets/images/default-avatar.png';
    }
    
    // Check if it's a base64 image or a URL
    if (punchFaceUrl.startsWith('data:image')) {
      return punchFaceUrl;
    }
    
    return punchFaceUrl;
  }

  getValidLocationCount(): number {
    if (!this.employeePunchInData) {
      return 0;
    }
    
    return this.employeePunchInData.punchIns.filter(
      punchIn => punchIn.punchLocationLat !== null && punchIn.punchLocationLong !== null
    ).length;
  }

  highlightTableRow(punchId: number): void {
    // Scroll to and highlight the table row
    setTimeout(() => {
      const tableRow = document.querySelector(`tr[data-punch-id="${punchId}"]`);
      if (tableRow) {
        tableRow.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add highlight effect
        tableRow.classList.add('highlight-row');
        setTimeout(() => {
          tableRow.classList.remove('highlight-row');
        }, 3000);
      }
    }, 100);
  }

}
