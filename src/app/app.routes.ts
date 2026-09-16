import { Routes } from '@angular/router';

import { Intro } from './pages/intro/intro';

export const routes: Routes = [
  {
    path: '',
    component: Intro,
    pathMatch: 'full',
  },
];
