import { Routes } from '@angular/router';
import { AdminDashboard } from './features/admin-dashboard/admin-dashboard';
import { AttendanceDashboardComponent } from './features/attendance-dashboard/attendance-dashboard.component';
import { Home } from './features/home/home';
import { Login } from './features/login/login';
import { ManageDesignation } from './features/manage-designation/manage-designation';
import { ManageEmployee } from './features/manage-employee/manage-employee';
import { PunchIn } from './features/punch-in/punch-in';
import { EmployeeLayoutComponent } from './features/employee-layout/employee-layout.component';
import { EmployeeDashboardComponent } from './features/employee-dashboard/employee-dashboard.component';
import { EmployeeProfileComponent } from './features/employee-profile/employee-profile.component';
import { EmployeeAttendanceComponent } from './features/employee-attendance/employee-attendance.component';
import ManageCompanyAdmin from './features/manage-company-admin/manage-company-admin';
import ManageCompany from './features/company-profile/company-profile';
import { Landing } from './features/landing/landing';
import { CompanyRegister } from './features/company-register/company-register';
import { NotFound } from './not-found/not-found';
import ManageCompanyProfile from './features/company-profile/company-profile';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'register', component: CompanyRegister },
    { path: 'login', component: Login },
    { path: 'punchin', component: PunchIn },
    {
        path: 'admin', component: AdminDashboard, children: [
            { path: 'dashboard', component: AttendanceDashboardComponent },
            { path: 'manage-user', component: ManageEmployee },
            { path: 'manage-designation', component: ManageDesignation },
            { path: 'manage-company-admin', component: ManageCompanyAdmin },
            { path: 'manage-company-profile', component: ManageCompanyProfile },
            { path: 'reports', loadComponent: () => import('./features/reports/reports').then(m => m.Reports) },
            { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.Profile) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    {
        path: 'employee', component: EmployeeLayoutComponent, children: [
            { path: 'dashboard', component: EmployeeDashboardComponent },
            { path: 'profile', component: EmployeeProfileComponent },
            { path: 'attendance', component: EmployeeAttendanceComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '404', component: NotFound },
    { path: '**', redirectTo: '404'}
];
