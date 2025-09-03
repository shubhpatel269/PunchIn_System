import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './landing.html'
})
export class Landing {
  
  features = [
    {
      icon: 'pi pi-clock',
      title: 'Real-time Attendance Tracking',
      description: 'Track employee attendance with precise time stamps and location verification for accurate payroll processing.'
    },
    {
      icon: 'pi pi-face-smile',
      title: 'Face Recognition Technology',
      description: 'Advanced AI-powered face recognition ensures secure and contactless punch-in/out for enhanced security.'
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Comprehensive Analytics',
      description: 'Get detailed insights into attendance patterns, productivity metrics, and generate custom reports.'
    },
    {
      icon: 'pi pi-mobile',
      title: 'Mobile-First Design',
      description: 'Access the system from any device with our responsive design optimized for mobile and desktop.'
    },
    {
      icon: 'pi pi-shield',
      title: 'Enterprise Security',
      description: 'Bank-level security with encrypted data transmission and secure cloud storage for your peace of mind.'
    },
    {
      icon: 'pi pi-users',
      title: 'Multi-Company Support',
      description: 'Manage multiple companies and departments with role-based access control and customizable permissions.'
    }
  ];

  advantages = [
    {
      title: 'Reduce Administrative Overhead',
      description: 'Automate attendance tracking and eliminate manual processes, saving up to 80% of HR administrative time.'
    },
    {
      title: 'Improve Accuracy',
      description: 'Eliminate human errors in attendance recording with automated systems and real-time verification.'
    },
    {
      title: 'Boost Employee Productivity',
      description: 'Transparent attendance tracking motivates employees and helps identify productivity patterns.'
    },
    {
      title: 'Ensure Compliance',
      description: 'Meet labor law requirements with detailed audit trails and automated compliance reporting.'
    }
  ];

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}