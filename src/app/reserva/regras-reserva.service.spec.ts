import { TestBed } from '@angular/core/testing';
import { RegrasReservaService } from './regras-reserva.service';

describe('RegrasReservaService', () => {
  let regras: RegrasReservaService;

  beforeEach(() => {
    regras = TestBed.inject(RegrasReservaService);
  });

  describe('codigoSalaValido', () => {
    it.each(['AZ-101', 'BC-000', 'ZZ-999'])('aceita %s', (codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(true);
    });

    it.each([
      ['vazio', ''],
      ['letras minúsculas', 'az-101'],
      ['uma letra só', 'A-101'],
      ['três letras', 'AZB-101'],
      ['sem hífen', 'AZ101'],
      ['dois dígitos', 'AZ-10'],
      ['letras no lugar dos dígitos', 'AZ-1O1'],
      ['espaço no início', ' AZ-101'],
    ])('recusa código com %s', (_, codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(false);
    });

    // O formato é "duas letras maiúsculas, hífen e três dígitos" (mensagem do formulário).
    it.each([
      ['quatro dígitos', 'AZ-1012'],
      ['sufixo depois dos dígitos', 'AZ-101X'],
      ['espaço no fim', 'AZ-101 '],
    ])('recusa código com %s', (_, codigo) => {
      expect(regras.codigoSalaValido(codigo)).toBe(false);
    });
  });

  describe('participantesValidos', () => {
    it.each([1, 2, 10, 500])('aceita %d', (participantes) => {
      expect(regras.participantesValidos(participantes)).toBe(true);
    });

    it.each([0, -1, 1.5, NaN, Infinity])('recusa %d', (participantes) => {
      expect(regras.participantesValidos(participantes)).toBe(false);
    });
  });

  describe('cabeNaSala', () => {
    it('aceita participantes abaixo da capacidade', () => {
      expect(regras.cabeNaSala(5, 8)).toBe(true);
    });

    it('aceita participantes iguais à capacidade', () => {
      expect(regras.cabeNaSala(8, 8)).toBe(true);
    });

    it('recusa participantes acima da capacidade', () => {
      expect(regras.cabeNaSala(9, 8)).toBe(false);
    });
  });

  describe('exigeAprovacaoGestor', () => {
    it.each([1, 10])('não exige aprovação para %d participantes', (participantes) => {
      expect(regras.exigeAprovacaoGestor(participantes)).toBe(false);
    });

    it.each([11, 50])('exige aprovação para %d participantes', (participantes) => {
      expect(regras.exigeAprovacaoGestor(participantes)).toBe(true);
    });
  });

  describe('horarioInicioPermitido', () => {
    it.each(['07:00', '07:30', '12:00', '19:00', '19:59'])('aceita %s', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(true);
    });

    it.each(['00:00', '06:59', '21:00', '23:59'])('recusa %s', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(false);
    });

    // As reuniões podem começar entre 07h00 e 19h59 (mensagem do formulário).
    it.each(['20:00', '20:30', '20:59'])('recusa %s', (horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(false);
    });

    it.each([
      ['vazio', ''],
      ['texto', 'abc'],
      ['sem minutos', '08'],
      ['minutos não numéricos', '08:xx'],
    ])('recusa horário %s', (_, horario) => {
      expect(regras.horarioInicioPermitido(horario)).toBe(false);
    });
  });
});
