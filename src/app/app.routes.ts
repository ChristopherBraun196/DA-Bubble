import { Routes } from '@angular/router';
import { Shell } from './pages/main/shell/shell';

import { Intro } from './pages/intro/intro';
import { Login } from './pages/login/login/login';

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
  { path: 'main', component: Shell },
];
