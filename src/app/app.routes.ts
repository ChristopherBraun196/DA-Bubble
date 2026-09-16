import { Routes } from '@angular/router';
import { Shell } from './pages/main/shell/shell';

import { Intro } from './pages/intro/intro';

export const routes: Routes = [
  {
    path: '',
    component: Intro,
    pathMatch: 'full',
  },
];
