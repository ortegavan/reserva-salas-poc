import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Reserva, Sala } from './sala';
import { SalaService } from './sala.service';

describe('SalaService', () => {
  let service: SalaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SalaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('consultar', () => {
    it('faz GET em /api/salas/{codigo} e devolve a sala', () => {
      const sala: Sala = { codigo: 'AZ-101', nome: 'Azul', capacidade: 8 };
      let resultado: Sala | undefined;

      service.consultar('AZ-101').subscribe((s) => (resultado = s));

      const req = http.expectOne('/api/salas/AZ-101');
      expect(req.request.method).toBe('GET');
      req.flush(sala);
      expect(resultado).toEqual(sala);
    });

    it('codifica o código da sala na URL', () => {
      service.consultar('A/B ?').subscribe();

      http.expectOne('/api/salas/A%2FB%20%3F').flush(null);
    });

    it('propaga o erro HTTP', () => {
      let erro: unknown;

      service.consultar('AZ-101').subscribe({ error: (e) => (erro = e) });

      http.expectOne('/api/salas/AZ-101').flush(null, { status: 404, statusText: 'Not Found' });
      expect(erro).toEqual(expect.objectContaining({ status: 404 }));
    });
  });

  describe('reservar', () => {
    const reserva: Reserva = {
      codigoSala: 'AZ-101',
      data: '2026-10-19',
      horarioInicio: '09:00',
      duracaoMinutos: 60,
      participantes: 4,
      exigeAprovacaoGestor: false,
    };

    it('faz POST em /api/salas/{codigo}/reservas com a reserva no corpo', () => {
      let concluiu = false;

      service.reservar(reserva).subscribe({ complete: () => (concluiu = true) });

      const req = http.expectOne('/api/salas/AZ-101/reservas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(reserva);
      req.flush(null);
      expect(concluiu).toBe(true);
    });

    it('codifica o código da sala na URL', () => {
      service.reservar({ ...reserva, codigoSala: 'A/B' }).subscribe();

      http.expectOne('/api/salas/A%2FB/reservas').flush(null);
    });

    it('propaga o erro HTTP', () => {
      let erro: unknown;

      service.reservar(reserva).subscribe({ error: (e) => (erro = e) });

      http
        .expectOne('/api/salas/AZ-101/reservas')
        .flush(null, { status: 500, statusText: 'Server Error' });
      expect(erro).toEqual(expect.objectContaining({ status: 500 }));
    });
  });
});
