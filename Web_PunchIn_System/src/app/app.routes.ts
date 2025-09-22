import { Routes } from '@angular/router';
import { AdminDashboard } from './features/admin-dashboard/admin-dashboard';
import { Login } from './features/login/login';
import { ManageDesignation } from './features/manage-designation/manage-designation';
import { ManageEmployee } from './features/manage-employee/manage-employee';
import { EmployeeLayoutComponent } from './features/employee-layout/employee-layout';
import { EmployeeDashboardComponent } from './features/employee-dashboard/employee-dashboard';
import { EmployeeProfileComponent } from './features/employee-profile/employee-profile';
import { EmployeeAttendanceComponent } from './features/employee-attendance/employee-attendance';
import ManageCompanyAdmin from './features/manage-company-admin/manage-company-admin';
import { Landing } from './features/landing/landing';
import { CompanyRegister } from './features/company-register/company-register';
import { NotFound } from './not-found/not-found';
import ManageCompanyProfile from './features/company-profile/company-profile';
import { AdminGuard } from './shared/guards/admin.guard';
import { EmployeeGuard } from './shared/guards/employee.guard';
import { AttendanceDashboardComponent } from './features/attendance-dashboard/attendance-dashboard';
import { Home } from './features/home/home';
import { AddNewProfileComponent } from './features/add-new-profile/add-new-profile';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'register', component: CompanyRegister },
    
    { path: 'login', component: Login },
    {
        path: 'admin', 
        component: AdminDashboard, 
        canActivate: [AdminGuard],
        children: [
            { path: 'dashboard', component: AttendanceDashboardComponent },
            { path: 'manage-admin', component: ManageCompanyAdmin },
            { path: 'manage-designation', component: ManageDesignation },
            { path: 'manage-employee', component: ManageEmployee },   
            { path: 'add-employee', component: AddNewProfileComponent },
            { path: 'edit-employee/:id', component: AddNewProfileComponent },
            // { path: 'manage-company-profile', component: ManageCompanyProfile },
            { path: 'reports', loadComponent: () => import('./features/reports/reports').then(m => m.Reports) },
            { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.Profile) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    {
        path: 'employee', 
        component: EmployeeLayoutComponent, 
        canActivate: [EmployeeGuard],
        children: [
            { path: 'home', component: Home },
            { path: 'dashboard', component: EmployeeDashboardComponent },
            { path: 'profile', component: EmployeeProfileComponent },
            { path: 'attendance', component: EmployeeAttendanceComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: 'notfound', component: NotFound },
    { path: '**', redirectTo: 'notfound'}
];
