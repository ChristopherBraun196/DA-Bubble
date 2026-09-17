import { Routes } from '@angular/router';
import { Shell } from './pages/main/shell/shell';

import { Intro } from './pages/intro/intro';
import { Login } from './pages/login/login/login';
import { Register } from './pages/login/register/register';
import { PasswordReset } from './pages/login/password-reset/password-reset';
import { Imprint } from './pages/imprint/imprint';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';

export const routes: Routes = [
  {
    path: '',
    component: Intro,
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  { path: 'register', component: Register },
  { path: 'password-reset', component: PasswordReset },

  { path: 'impressum', component: Imprint },
  { path: 'datenschutz', component: PrivacyPolicy },

  { path: 'main', component: Shell },
];
