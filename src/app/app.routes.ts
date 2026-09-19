import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/intro/intro').then((module) => module.Intro),
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/login/register/register').then((module) => module.Register),
  },
  {
    path: 'choose-avatar',
    loadComponent: () =>
      import('./pages/login/choose-avatar/choose-avatar').then((module) => module.ChooseAvatar),
  },
  {
    path: 'password-reset',
    loadComponent: () =>
      import('./pages/login/password-reset/password-reset').then((module) => module.PasswordReset),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/login/reset-password/reset-password').then((module) => module.ResetPassword),
  },
  {
    path: 'impressum',
    loadComponent: () => import('./pages/imprint/imprint').then((module) => module.Imprint),
  },
  {
    path: 'datenschutz',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((module) => module.PrivacyPolicy),
  },
  {
    path: 'main',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/main/shell/shell').then((module) => module.Shell),
  },
];
