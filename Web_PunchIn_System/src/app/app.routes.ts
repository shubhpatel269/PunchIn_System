import { Routes } from '@angular/router';
import { AdminDashboard } from './features/admin-dashboard/admin-dashboard';
import { AttendanceDashboardComponent } from './features/attendance-dashboard/attendance-dashboard.component';
import { Home } from './features/home/home';
import { Login } from './features/login/login';
import { ManageDesignation } from './features/manage-designation/manage-designation';
import { ManageEmployee } from './features/manage-employee/manage-employee';
import { PunchIn } from './features/punch-in/punch-in';

export const routes: Routes = [
    { path: 'home', component: Home },
    { path: 'login', component: Login },
    { path: 'punchin', component: PunchIn },
    {
        path: 'admin', component: AdminDashboard, children: [
            { path: 'dashboard', component: AttendanceDashboardComponent },
            { path: 'manage-user', component: ManageEmployee },
            { path: 'manage-designation', component: ManageDesignation },
            {
                path: 'manage-company-admin',
                loadComponent: () => import('./features/manage-company-admin/manage-company-admin')
                    .then(m => m.default)
            },
            { path: 'reports', loadComponent: () => import('./features/reports/reports').then(m => m.Reports) },
            { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.Profile) },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'login' }
];
