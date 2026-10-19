import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Reserva, Sala } from './sala';

@Injectable({ providedIn: 'root' })
export class SalaService {
  private readonly http = inject(HttpClient);

  consultar(codigo: string): Observable<Sala> {
    return this.http.get<Sala>(`/api/salas/${encodeURIComponent(codigo)}`);
  }

  reservar(reserva: Reserva): Observable<void> {
    return this.http.post<void>(
      `/api/salas/${encodeURIComponent(reserva.codigoSala)}/reservas`,
      reserva,
    );
  }
}
