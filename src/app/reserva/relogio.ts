import { InjectionToken } from '@angular/core';

export const RELOGIO = new InjectionToken<() => Date>('RELOGIO', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
