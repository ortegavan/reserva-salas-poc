import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';
import { RELOGIO } from './relogio';
import { ReservaComponent } from './reserva.component';
import { Reserva, Sala } from './sala';
import { SalaService } from './sala.service';

const SALA_AZUL: Sala = { codigo: 'AZ-101', nome: 'Sala Azul', capacidade: 12 };
const SALA_VERDE: Sala = { codigo: 'VD-202', nome: 'Sala Verde', capacidade: 4 };

describe('ReservaComponent', () => {
  let fixture: ComponentFixture<ReservaComponent>;
  let component: ReservaComponent;
  let elemento: HTMLElement;
  let consultas: Map<string, Subject<Sala>>;
  let envio: Subject<void>;
  let salaService: { consultar: jest.Mock; reservar: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    consultas = new Map();
    envio = new Subject<void>();
    salaService = {
      consultar: jest.fn((codigo: string) => {
        const resposta = new Subject<Sala>();
        consultas.set(codigo, resposta);
        return resposta;
      }),
      reservar: jest.fn(() => envio),
    };

    TestBed.configureTestingModule({
      imports: [ReservaComponent],
      providers: [
        { provide: SalaService, useValue: salaService },
        { provide: RELOGIO, useValue: () => new Date(2026, 9, 19, 10, 0) },
      ],
    });
    fixture = TestBed.createComponent(ReservaComponent);
    component = fixture.componentInstance;
    elemento = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function render(): void {
    fixture.detectChanges();
  }

  function digitar(id: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    render();
  }

  function informarSala(codigo: string, sala: Sala): void {
    digitar('codigoSala', codigo);
    jest.advanceTimersByTime(300);
    consultas.get(codigo)!.next(sala);
    consultas.get(codigo)!.complete();
    render();
  }

  function preencherFormularioValido(): void {
    informarSala('AZ-101', SALA_AZUL);
    digitar('horarioInicio', '09:00');
    digitar('participantes', '4');
  }

  function botaoReservar(): HTMLButtonElement {
    return elemento.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function texto(): string {
    return elemento.textContent ?? '';
  }

  describe('estado inicial', () => {
    it('usa a data do relógio como data padrão e mínima', () => {
      expect(component.hoje).toBe('2026-10-19');
      expect(component.form.controls.data.value).toBe('2026-10-19');
      expect(elemento.querySelector<HTMLInputElement>('#data')!.min).toBe('2026-10-19');
    });

    it('começa com 1 participante e 60 minutos de duração', () => {
      expect(component.form.controls.participantes.value).toBe(1);
      expect(component.form.controls.duracaoMinutos.value).toBe(60);
    });

    it('oferece as durações de 30, 60, 90 e 120 minutos', () => {
      const opcoes = Array.from(elemento.querySelectorAll('#duracaoMinutos option')).map((o) =>
        o.textContent!.trim(),
      );
      expect(opcoes).toEqual(['30 minutos', '60 minutos', '90 minutos', '120 minutos']);
    });

    it('começa inválido, sem sala consultada', () => {
      expect(component.form.invalid).toBe(true);
      expect(component.form.hasError('salaNaoConsultada')).toBe(true);
    });
  });

  describe('R1 — participantes', () => {
    it('marca erro e exibe mensagem com 0 participantes', () => {
      digitar('participantes', '0');
      expect(component.form.controls.participantes.hasError('participantesInvalidos')).toBe(true);
      expect(texto()).toContain('Informe pelo menos um participante.');
    });

    it('marca erro com número fracionado de participantes', () => {
      digitar('participantes', '2.5');
      expect(component.form.controls.participantes.hasError('participantesInvalidos')).toBe(true);
    });

    it('aceita 1 participante', () => {
      digitar('participantes', '1');
      expect(component.form.controls.participantes.valid).toBe(true);
      expect(texto()).not.toContain('Informe pelo menos um participante.');
    });
  });

  describe('R2 — código da sala', () => {
    it('aceita código no formato correto', () => {
      digitar('codigoSala', 'AZ-101');
      expect(component.form.controls.codigoSala.valid).toBe(true);
    });

    it.each(['az-101', 'AZ101', 'AZ-10', 'A-101'])('marca erro de formato para %p', (codigo) => {
      digitar('codigoSala', codigo);
      expect(component.form.controls.codigoSala.hasError('formatoCodigoSala')).toBe(true);
      expect(texto()).toContain('Use duas letras maiúsculas, hífen e três dígitos.');
    });

    it('marca erro de formato para código com caracteres a mais', () => {
      digitar('codigoSala', 'AZ-1012');
      expect(component.form.controls.codigoSala.hasError('formatoCodigoSala')).toBe(true);
    });

    it('exige o código da sala', () => {
      expect(component.form.controls.codigoSala.hasError('required')).toBe(true);
    });

    it('não consulta a sala quando o código é inválido', () => {
      digitar('codigoSala', 'az-101');
      jest.advanceTimersByTime(300);
      expect(salaService.consultar).not.toHaveBeenCalled();
    });
  });

  describe('consulta da sala', () => {
    it('consulta a sala após 300 ms sem digitação e exibe nome e capacidade', () => {
      digitar('codigoSala', 'AZ-101');
      jest.advanceTimersByTime(299);
      expect(salaService.consultar).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(salaService.consultar).toHaveBeenCalledWith('AZ-101');

      consultas.get('AZ-101')!.next(SALA_AZUL);
      render();
      expect(component.sala()).toEqual(SALA_AZUL);
      expect(elemento.querySelector('.sala-dados')!.textContent).toContain(
        'Sala Azul — capacidade para 12 pessoas',
      );
      expect(component.consultandoSala()).toBe(false);
    });

    it('exibe "Consultando sala…" enquanto a consulta não responde', () => {
      digitar('codigoSala', 'AZ-101');
      expect(elemento.querySelector('.sala-consultando')?.textContent).toBe('Consultando sala…');
      jest.advanceTimersByTime(300);
      render();
      expect(elemento.querySelector('.sala-consultando')).not.toBeNull();
    });

    it('exibe "Sala não encontrada." quando a consulta falha', () => {
      digitar('codigoSala', 'AZ-101');
      jest.advanceTimersByTime(300);
      consultas.get('AZ-101')!.error(new Error('404'));
      render();
      expect(component.sala()).toBeNull();
      expect(component.salaNaoEncontrada()).toBe(true);
      expect(texto()).toContain('Sala não encontrada.');
      expect(texto()).not.toContain('Consultando sala…');
    });

    it('não exibe "Sala não encontrada." para código com formato inválido', () => {
      digitar('codigoSala', 'az-101');
      jest.advanceTimersByTime(300);
      render();
      expect(component.salaNaoEncontrada()).toBe(false);
      expect(texto()).not.toContain('Sala não encontrada.');
    });

    it('descarta a resposta de uma consulta anterior ao trocar de código', () => {
      digitar('codigoSala', 'AZ-101');
      jest.advanceTimersByTime(300);
      digitar('codigoSala', 'VD-202');
      jest.advanceTimersByTime(300);

      consultas.get('AZ-101')!.next(SALA_AZUL);
      consultas.get('VD-202')!.next(SALA_VERDE);
      render();
      expect(component.sala()).toEqual(SALA_VERDE);
    });
  });

  describe('R3 — capacidade da sala', () => {
    it('aceita participantes igual à capacidade', () => {
      informarSala('VD-202', SALA_VERDE);
      digitar('participantes', '4');
      expect(component.form.hasError('capacidadeExcedida')).toBe(false);
    });

    it('marca erro e exibe mensagem quando passa da capacidade', () => {
      informarSala('VD-202', SALA_VERDE);
      digitar('participantes', '5');
      expect(component.form.hasError('capacidadeExcedida')).toBe(true);
      expect(texto()).toContain('O número de participantes passa da capacidade da sala.');
    });

    it('reavalia a capacidade quando a sala muda', () => {
      digitar('participantes', '5');
      informarSala('AZ-101', SALA_AZUL);
      expect(component.form.hasError('capacidadeExcedida')).toBe(false);

      informarSala('VD-202', SALA_VERDE);
      expect(component.form.hasError('capacidadeExcedida')).toBe(true);
    });
  });

  describe('R4 — aprovação do gestor', () => {
    const AVISO = 'Esta reunião precisa de aprovação do gestor.';

    it('não exige aprovação com 9 participantes', () => {
      digitar('participantes', '9');
      expect(component.exigeAprovacaoGestor()).toBe(false);
      expect(texto()).not.toContain(AVISO);
    });

    it('exige aprovação com exatamente 10 participantes', () => {
      digitar('participantes', '10');
      expect(component.exigeAprovacaoGestor()).toBe(true);
      expect(texto()).toContain(AVISO);
    });

    it('exige aprovação com 11 participantes', () => {
      digitar('participantes', '11');
      expect(component.exigeAprovacaoGestor()).toBe(true);
      expect(texto()).toContain(AVISO);
    });

    it('envia exigeAprovacaoGestor = true na reserva com 10 participantes', () => {
      preencherFormularioValido();
      digitar('participantes', '10');
      component.reservar();
      expect(salaService.reservar).toHaveBeenCalledWith(
        expect.objectContaining({ participantes: 10, exigeAprovacaoGestor: true }),
      );
    });
  });

  describe('R5 — horário de início', () => {
    const ERRO = 'As reuniões podem começar entre 07h00 e 19h59.';

    it.each(['07:00', '19:59'])('aceita %p', (horario) => {
      digitar('horarioInicio', horario);
      expect(component.form.controls.horarioInicio.valid).toBe(true);
      expect(texto()).not.toContain(ERRO);
    });

    it('rejeita 06:59', () => {
      digitar('horarioInicio', '06:59');
      expect(component.form.controls.horarioInicio.hasError('horarioNaoPermitido')).toBe(true);
      expect(texto()).toContain(ERRO);
    });

    it.each(['20:00', '20:30'])('rejeita %p', (horario) => {
      digitar('horarioInicio', horario);
      expect(component.form.controls.horarioInicio.hasError('horarioNaoPermitido')).toBe(true);
      expect(texto()).toContain(ERRO);
    });

    it('exige o horário de início', () => {
      expect(component.form.controls.horarioInicio.hasError('required')).toBe(true);
    });
  });

  describe('R6 — botão "Reservar"', () => {
    it('fica desabilitado com o formulário inválido', () => {
      expect(component.form.invalid).toBe(true);
      expect(botaoReservar().disabled).toBe(true);
    });

    it('fica habilitado com o formulário válido', () => {
      preencherFormularioValido();
      expect(component.form.valid).toBe(true);
      expect(botaoReservar().disabled).toBe(false);
    });

    it('fica desabilitado enquanto o envio está em andamento', () => {
      preencherFormularioValido();
      botaoReservar().click();
      render();
      expect(component.enviando()).toBe(true);
      expect(botaoReservar().disabled).toBe(true);
    });

    it('volta a ficar habilitado quando o envio termina', () => {
      preencherFormularioValido();
      botaoReservar().click();
      envio.next();
      envio.complete();
      render();
      expect(component.enviando()).toBe(false);
      expect(botaoReservar().disabled).toBe(false);
    });

    it('fica desabilitado com formulário inválido mesmo durante um envio', () => {
      preencherFormularioValido();
      component.reservar();
      digitar('participantes', '0');
      expect(botaoReservar().disabled).toBe(true);
    });

    it('não dispara reserva duplicada ao enviar duas vezes seguidas', () => {
      preencherFormularioValido();
      component.reservar();
      component.reservar();
      expect(salaService.reservar).toHaveBeenCalledTimes(1);
    });
  });

  describe('R7 — troca do código da sala', () => {
    it('some com os dados da sala anterior e mostra "Consultando sala…" imediatamente', () => {
      informarSala('AZ-101', SALA_AZUL);
      expect(texto()).toContain('Sala Azul');

      digitar('codigoSala', 'VD-202');
      expect(texto()).not.toContain('Sala Azul');
      expect(texto()).not.toContain('capacidade para 12 pessoas');
      expect(texto()).toContain('Consultando sala…');
    });

    it('mostra os dados da nova sala quando a consulta responde', () => {
      informarSala('AZ-101', SALA_AZUL);
      informarSala('VD-202', SALA_VERDE);
      expect(texto()).toContain('Sala Verde — capacidade para 4 pessoas');
      expect(texto()).not.toContain('Sala Azul');
      expect(texto()).not.toContain('Consultando sala…');
    });
  });

  describe('reservar', () => {
    it('não envia quando o formulário é inválido', () => {
      component.reservar();
      expect(salaService.reservar).not.toHaveBeenCalled();
      expect(component.enviando()).toBe(false);
    });

    it('envia a reserva com os valores do formulário', () => {
      preencherFormularioValido();
      component.form.controls.duracaoMinutos.setValue(90);
      component.reservar();

      const reserva: Reserva = {
        codigoSala: 'AZ-101',
        data: '2026-10-19',
        horarioInicio: '09:00',
        duracaoMinutos: 90,
        participantes: 4,
        exigeAprovacaoGestor: false,
      };
      expect(salaService.reservar).toHaveBeenCalledWith(reserva);
    });

    it('envia participantes como número', () => {
      preencherFormularioValido();
      component.reservar();
      expect(typeof salaService.reservar.mock.calls[0][0].participantes).toBe('number');
    });

    it('exibe confirmação quando a reserva é aceita', () => {
      preencherFormularioValido();
      component.reservar();
      envio.next();
      envio.complete();
      render();
      expect(component.reservaConfirmada()).toBe(true);
      expect(component.erroEnvio()).toBe(false);
      expect(texto()).toContain('Reserva enviada.');
    });

    it('exibe erro quando a reserva falha', () => {
      salaService.reservar.mockReturnValue(throwError(() => new Error('500')));
      preencherFormularioValido();
      component.reservar();
      render();
      expect(component.erroEnvio()).toBe(true);
      expect(component.reservaConfirmada()).toBe(false);
      expect(component.enviando()).toBe(false);
      expect(texto()).toContain('Não foi possível concluir a reserva. Tente novamente.');
    });

    it('limpa a mensagem de erro anterior ao tentar novamente', () => {
      salaService.reservar.mockReturnValueOnce(throwError(() => new Error('500')));
      preencherFormularioValido();
      component.reservar();
      expect(component.erroEnvio()).toBe(true);

      component.reservar();
      expect(component.erroEnvio()).toBe(false);
      expect(component.enviando()).toBe(true);
    });
  });
});
