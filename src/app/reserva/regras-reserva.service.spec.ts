import { TestBed } from '@angular/core/testing';
import { RegrasReservaService } from './regras-reserva.service';

describe('RegrasReservaService', () => {
  let regras: RegrasReservaService;

  beforeEach(() => {
    regras = TestBed.inject(RegrasReservaService);
  });

  describe('participantesValidos (R1)', () => {
    it.each([1, 2, 10, 500])('aceita %p participante(s)', (participantes) => {
      expect(regras.participantesValidos(participantes)).toBe(true);
    });

    it.each([0, -1, 1.5, NaN, Infinity])('rejeita %p', (participantes) => {
      expect(regras.participantesValidos(participantes)).toBe(false);
    });
  });

  describe('codigoSalaValido (R2)', () => {
    it.each(['AZ-101', 'BC-000', 'ZZ-999'])('aceita %p', (codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(true);
    });

    it.each([
      ['vazio', ''],
      ['letras minúsculas', 'az-101'],
      ['uma letra só', 'A-101'],
      ['três letras', 'AZB-101'],
      ['sem hífen', 'AZ101'],
      ['dois dígitos', 'AZ-10'],
      ['letra no lugar de dígito', 'AZ-10A'],
      ['espaço no início', ' AZ-101'],
    ])('rejeita código com %s (%p)', (_, codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(false);
    });

    it.each([
      ['quatro dígitos', 'AZ-1012'],
      ['sufixo de letras', 'AZ-101X'],
      ['espaço no final', 'AZ-101 '],
    ])('rejeita código com mais caracteres que o formato: %s (%p)', (_, codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(false);
    });
  });

  describe('cabeNaSala (R3)', () => {
    it('aceita participantes abaixo da capacidade', () => {
      expect(regras.cabeNaSala(5, 8)).toBe(true);
    });

    it('aceita participantes exatamente na capacidade', () => {
      expect(regras.cabeNaSala(8, 8)).toBe(true);
    });

    it('rejeita participantes acima da capacidade', () => {
      expect(regras.cabeNaSala(9, 8)).toBe(false);
    });
  });

  describe('exigeAprovacaoGestor (R4)', () => {
    it.each([1, 9])('não exige aprovação para %p participantes', (participantes) => {
      expect(regras.exigeAprovacaoGestor(participantes)).toBe(false);
    });

    it('exige aprovação para exatamente 10 participantes', () => {
      expect(regras.exigeAprovacaoGestor(10)).toBe(true);
    });

    it.each([11, 50])('exige aprovação para %p participantes', (participantes) => {
      expect(regras.exigeAprovacaoGestor(participantes)).toBe(true);
    });
  });

  describe('horarioInicioPermitido (R5)', () => {
    it.each(['07:00', '07:01', '12:30', '19:00', '19:59'])('permite %p', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(true);
    });

    it.each(['00:00', '06:00', '06:59'])('não permite %p (antes das 07h00)', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(false);
    });

    it.each(['20:00', '20:30', '20:59', '21:00', '23:59'])(
      'não permite %p (a partir das 20h00)',
      (horario) => {
        expect(regras.horarioInicioPermitido(horario)).toBe(false);
      },
    );

    it.each(['', 'abc', 'xx:30', '10:yy'])('rejeita valor inválido %p', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(false);
    });
  });
});
