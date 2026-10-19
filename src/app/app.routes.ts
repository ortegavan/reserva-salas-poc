import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./reserva/reserva.component').then((m) => m.ReservaComponent),
  },
];
