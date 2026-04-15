import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { platformGuard } from './core/platform.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard, platformGuard],
    loadComponent: () =>
      import('./pages/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./pages/clients/clients.component').then(
            (m) => m.ClientsComponent,
          ),
      },
      {
        path: 'planos',
        loadComponent: () =>
          import('./pages/plans/plans.component').then((m) => m.PlansComponent),
      },
      {
        path: 'vouchers',
        loadComponent: () =>
          import('./pages/vouchers/vouchers.component').then(
            (m) => m.VouchersComponent,
          ),
      },
      {
        path: 'condominios',
        loadComponent: () =>
          import('./pages/condominiums/condominiums-list.component').then(
            (m) => m.CondominiumsListComponent,
          ),
      },
      {
        path: 'condominios/:id',
        loadComponent: () =>
          import('./pages/condominiums/condominium-detail.component').then(
            (m) => m.CondominiumDetailComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
