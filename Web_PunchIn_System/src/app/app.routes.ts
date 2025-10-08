import { Routes } from '@angular/router';
import { AdminGuard } from './shared/guards/admin.guard';
import { EmployeeGuard } from './shared/guards/employee.guard';

export const routes: Routes = [
    // Public routes with lazy loading
    { 
        path: '', 
        loadComponent: () => import('./features/landing/landing').then(m => m.Landing)
    },
    { 
        path: 'register', 
        loadComponent: () => import('./features/company-register/company-register').then(m => m.CompanyRegister)
    },
    { 
        path: 'login', 
        loadComponent: () => import('./features/login/login').then(m => m.Login)
    },
    
    // Admin routes with lazy loading
    {
        path: 'admin', 
        loadComponent: () => import('./features/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard), 
        canActivate: [AdminGuard],
        children: [
            { 
                path: 'dashboard', 
                loadComponent: () => import('./features/attendance-dashboard/attendance-dashboard').then(m => m.AttendanceDashboardComponent)
            },
            { 
                path: 'manage-admin', 
                loadComponent: () => import('./features/manage-company-admin/manage-company-admin').then(m => m.default)
            },
            { 
                path: 'manage-designation', 
                loadComponent: () => import('./features/manage-designation/manage-designation').then(m => m.ManageDesignation)
            },
            { 
                path: 'manage-employee', 
                loadComponent: () => import('./features/manage-employee/manage-employee').then(m => m.ManageEmployee)
            },   
            { 
                path: 'add-employee', 
                loadComponent: () => import('./features/add-new-profile/add-new-profile').then(m => m.AddNewProfileComponent)
            },
            { 
                path: 'edit-employee/:id', 
                loadComponent: () => import('./features/add-new-profile/add-new-profile').then(m => m.AddNewProfileComponent)
            },
            { 
                path: 'employee-attendance/:id', 
                loadComponent: () => import('./features/employee-attendance/employee-attendance').then(m => m.EmployeeAttendanceComponent)
            },
            { 
                path: 'employee-punchins/:id', 
                loadComponent: () => import('./features/employee-punchin/employee-punchin').then(m => m.EmployeePunchInComponent)
            },
            { 
                path: 'employee-activity-log/:employeeId/:sessionId', 
                loadComponent: () => import('./features/employee-activity-log/employee-activity-log').then(m => m.EmployeeActivityLogComponent)
            },
            { 
                path: 'holiday-management', 
                loadComponent: () => import('./features/holiday-management/holiday-management').then(m => m.HolidayManagementComponent)
            },
            { 
                path: 'company-settings', 
                loadComponent: () => import('./features/company-settings/company-settings').then(m => m.CompanySettingsComponent)
            },
            { 
                path: 'profile', 
                loadComponent: () => import('./features/profile/profile').then(m => m.Profile)
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    
    // Employee routes with lazy loading
    {
        path: 'employee', 
        loadComponent: () => import('./features/employee-layout/employee-layout').then(m => m.EmployeeLayoutComponent), 
        canActivate: [EmployeeGuard],
        children: [
            { 
                path: 'dashboard', 
                loadComponent: () => import('./features/employee-dashboard/employee-dashboard').then(m => m.EmployeeDashboardComponent)
            },
            { 
                path: 'profile', 
                loadComponent: () => import('./features/employee-profile/employee-profile').then(m => m.EmployeeProfileComponent)
            },
            { 
                path: 'attendance', 
                loadComponent: () => import('./features/employee-attendance/employee-attendance').then(m => m.EmployeeAttendanceComponent)
            },
            { 
                path: 'company-details', 
                loadComponent: () => import('./features/employee-company-details/employee-company-details').then(m => m.EmployeeCompanyDetailsComponent)
            },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    
    // Error routes with lazy loading
    { 
        path: 'notfound', 
        loadComponent: () => import('./not-found/not-found').then(m => m.NotFound)
    },
    { path: '**', redirectTo: 'notfound'}
];
