import { Injectable } from '@angular/core';

const FORMATO_CODIGO_SALA = /^[A-Z]{2}-\d{3}/;

@Injectable({ providedIn: 'root' })
export class RegrasReservaService {
  codigoSalaValido(codigo: string): boolean {
    return FORMATO_CODIGO_SALA.test(codigo);
  }

  participantesValidos(participantes: number): boolean {
    return Number.isInteger(participantes) && participantes >= 1;
  }

  cabeNaSala(participantes: number, capacidade: number): boolean {
    return participantes <= capacidade;
  }

  exigeAprovacaoGestor(participantes: number): boolean {
    return participantes > 10;
  }

  horarioInicioPermitido(horario: string): boolean {
    const [hora, minuto] = horario.split(':').map(Number);
    if (Number.isNaN(hora) || Number.isNaN(minuto)) {
      return false;
    }
    return hora >= 7 && hora <= 20;
  }
}
