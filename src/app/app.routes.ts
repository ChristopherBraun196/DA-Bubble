import { Routes } from '@angular/router';
import { Shell } from './pages/main/shell/shell';

import { Intro } from './pages/intro/intro';
import { Login } from './pages/login/login/login';
import { Register } from './pages/login/register/register';

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
  { path: 'main', component: Shell },
];
