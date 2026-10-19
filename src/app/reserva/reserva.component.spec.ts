import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { ReservaComponent } from './reserva.component';
import { RELOGIO } from './relogio';
import { Reserva, Sala } from './sala';
import { SalaService } from './sala.service';

const SALA_AZUL: Sala = { codigo: 'AZ-101', nome: 'Sala Azul', capacidade: 8 };

describe('ReservaComponent', () => {
  let fixture: ComponentFixture<ReservaComponent>;
  let component: ReservaComponent;
  let elemento: HTMLElement;
  let consultas: Subject<Sala>[];
  let envios: Subject<void>[];
  let salaService: {
    consultar: jest.Mock<Observable<Sala>, [string]>;
    reservar: jest.Mock<Observable<void>, [Reserva]>;
  };

  function criar(agora = new Date(2026, 9, 19, 10, 0)): void {
    TestBed.configureTestingModule({
      imports: [ReservaComponent],
      providers: [
        { provide: SalaService, useValue: salaService },
        { provide: RELOGIO, useValue: () => agora },
      ],
    });
    fixture = TestBed.createComponent(ReservaComponent);
    component = fixture.componentInstance;
    elemento = fixture.nativeElement;
    renderizar();
  }

  function renderizar(): void {
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  function campo<T extends HTMLElement = HTMLInputElement>(id: string): T {
    return elemento.querySelector<T>(`#${id}`)!;
  }

  function digitar(id: string, valor: string): void {
    const input = campo(id);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    renderizar();
  }

  function informarSala(codigo: string, sala: Sala | null = { ...SALA_AZUL, codigo }): void {
    digitar('codigoSala', codigo);
    jest.advanceTimersByTime(300);
    const consulta = consultas.at(-1)!;
    if (sala) {
      consulta.next(sala);
      consulta.complete();
    } else {
      consulta.error(new Error('404'));
    }
    renderizar();
  }

  function preencherFormularioValido(): void {
    informarSala('AZ-101');
    digitar('horarioInicio', '09:00');
    digitar('participantes', '4');
  }

  function texto(): string {
    return elemento.textContent ?? '';
  }

  function botaoReservar(): HTMLButtonElement {
    return elemento.querySelector('button[type="submit"]')!;
  }

  function enviarFormulario(): void {
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
    renderizar();
  }

  beforeEach(() => {
    jest.useFakeTimers();
    consultas = [];
    envios = [];
    salaService = {
      consultar: jest.fn(() => {
        const consulta = new Subject<Sala>();
        consultas.push(consulta);
        return consulta;
      }),
      reservar: jest.fn(() => {
        const envio = new Subject<void>();
        envios.push(envio);
        return envio;
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('estado inicial', () => {
    beforeEach(() => criar());

    it('usa a data do relógio como data inicial e mínima', () => {
      expect(component.hoje).toBe('2026-10-19');
      expect(component.form.controls.data.value).toBe('2026-10-19');
      expect(campo('data').value).toBe('2026-10-19');
      expect(campo('data').min).toBe('2026-10-19');
    });

    it('preenche duração de 60 minutos e 1 participante', () => {
      expect(component.form.controls.duracaoMinutos.value).toBe(60);
      expect(component.form.controls.participantes.value).toBe(1);
    });

    it('oferece as durações de 30, 60, 90 e 120 minutos', () => {
      const opcoes = Array.from(campo<HTMLSelectElement>('duracaoMinutos').options).map((o) =>
        o.textContent?.trim(),
      );
      expect(opcoes).toEqual(['30 minutos', '60 minutos', '90 minutos', '120 minutos']);
    });

    it('começa inválido porque nenhuma sala foi consultada', () => {
      expect(component.form.invalid).toBe(true);
      expect(component.form.hasError('salaNaoConsultada')).toBe(true);
      expect(botaoReservar().disabled).toBe(true);
    });

    it('não exige aprovação do gestor', () => {
      expect(component.exigeAprovacaoGestor()).toBe(false);
      expect(texto()).not.toContain('aprovação do gestor');
    });
  });

  it('formata a data de hoje com mês e dia com dois dígitos', () => {
    criar(new Date(2027, 0, 5, 8, 0));

    expect(component.hoje).toBe('2027-01-05');
  });

  describe('consulta da sala', () => {
    beforeEach(() => criar());

    it('mostra "consultando" ao digitar e só consulta após 300 ms', () => {
      digitar('codigoSala', 'AZ-101');

      expect(component.consultandoSala()).toBe(true);
      expect(texto()).toContain('Consultando sala…');
      jest.advanceTimersByTime(299);
      expect(salaService.consultar).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(salaService.consultar).toHaveBeenCalledWith('AZ-101');
    });

    it('mostra os dados da sala encontrada', () => {
      informarSala('AZ-101');

      expect(component.sala()).toEqual(SALA_AZUL);
      expect(component.consultandoSala()).toBe(false);
      expect(component.salaNaoEncontrada()).toBe(false);
      expect(texto()).toContain('Sala Azul — capacidade para 8 pessoas');
      expect(texto()).not.toContain('Consultando sala…');
    });

    it('consulta só o último código digitado dentro do intervalo', () => {
      digitar('codigoSala', 'AZ-1');
      jest.advanceTimersByTime(100);
      digitar('codigoSala', 'AZ-10');
      jest.advanceTimersByTime(100);
      digitar('codigoSala', 'AZ-101');
      jest.advanceTimersByTime(300);

      expect(salaService.consultar).toHaveBeenCalledTimes(1);
      expect(salaService.consultar).toHaveBeenCalledWith('AZ-101');
    });

    it('descarta a resposta de uma consulta substituída por outra', () => {
      digitar('codigoSala', 'AZ-101');
      jest.advanceTimersByTime(300);
      digitar('codigoSala', 'BC-202');
      jest.advanceTimersByTime(300);

      consultas[0].next(SALA_AZUL);
      renderizar();
      expect(component.sala()).toBeNull();

      const salaBc = { codigo: 'BC-202', nome: 'Sala BC', capacidade: 4 };
      consultas[1].next(salaBc);
      renderizar();
      expect(component.sala()).toEqual(salaBc);
    });

    it('não consulta o servidor quando o formato do código é inválido', () => {
      digitar('codigoSala', 'az-101');
      jest.advanceTimersByTime(300);
      renderizar();

      expect(salaService.consultar).not.toHaveBeenCalled();
      expect(component.form.controls.codigoSala.hasError('formatoCodigoSala')).toBe(true);
      expect(component.sala()).toBeNull();
      expect(component.consultandoSala()).toBe(false);
      expect(component.salaNaoEncontrada()).toBe(false);
      expect(texto()).toContain('Use duas letras maiúsculas, hífen e três dígitos.');
      expect(texto()).not.toContain('Sala não encontrada.');
    });

    it('não mostra erro de formato antes de o campo ser tocado', () => {
      component.form.controls.codigoSala.setValue('az-101');
      renderizar();

      expect(component.form.controls.codigoSala.hasError('formatoCodigoSala')).toBe(true);
      expect(texto()).not.toContain('Use duas letras maiúsculas');
    });

    it('não marca sala não encontrada quando o código fica vazio', () => {
      digitar('codigoSala', '');
      jest.advanceTimersByTime(300);
      renderizar();

      expect(salaService.consultar).not.toHaveBeenCalled();
      expect(component.form.controls.codigoSala.hasError('required')).toBe(true);
      expect(component.salaNaoEncontrada()).toBe(false);
    });

    it('marca sala não encontrada quando a consulta falha', () => {
      informarSala('AZ-999', null);

      expect(component.sala()).toBeNull();
      expect(component.salaNaoEncontrada()).toBe(true);
      expect(component.consultandoSala()).toBe(false);
      expect(component.form.hasError('salaNaoConsultada')).toBe(true);
      expect(texto()).toContain('Sala não encontrada.');
    });

    it('continua consultando depois de uma falha', () => {
      informarSala('AZ-999', null);
      informarSala('AZ-101');

      expect(component.sala()).toEqual(SALA_AZUL);
      expect(component.salaNaoEncontrada()).toBe(false);
    });

    it('limpa "sala não encontrada" ao digitar outro código', () => {
      informarSala('AZ-999', null);

      digitar('codigoSala', 'AZ-101');

      expect(component.salaNaoEncontrada()).toBe(false);
      expect(texto()).not.toContain('Sala não encontrada.');
    });

    it('para de consultar quando o componente é destruído', () => {
      fixture.destroy();
      component.form.controls.codigoSala.setValue('AZ-101');
      jest.advanceTimersByTime(300);

      expect(salaService.consultar).not.toHaveBeenCalled();
    });

    // Enquanto o novo código é consultado, a sala anterior não pode continuar
    // valendo para a validação de capacidade nem para o envio.
    it('invalida o formulário assim que o código da sala muda', () => {
      preencherFormularioValido();
      expect(component.form.valid).toBe(true);

      digitar('codigoSala', 'BC-202');

      expect(component.form.valid).toBe(false);
      expect(component.sala()).toBeNull();
    });
  });

  describe('validações', () => {
    beforeEach(() => criar());

    it('exige horário de início', () => {
      informarSala('AZ-101');

      expect(component.form.controls.horarioInicio.hasError('required')).toBe(true);
      expect(component.form.invalid).toBe(true);
    });

    it('fica válido com sala, horário e participantes válidos', () => {
      preencherFormularioValido();

      expect(component.form.valid).toBe(true);
      expect(botaoReservar().disabled).toBe(false);
    });

    it('recusa horário fora do permitido e mostra a mensagem', () => {
      digitar('horarioInicio', '06:30');

      expect(component.form.controls.horarioInicio.hasError('horarioNaoPermitido')).toBe(true);
      expect(texto()).toContain('As reuniões podem começar entre 07h00 e 19h59.');
    });

    it('aceita horário permitido sem mensagem', () => {
      digitar('horarioInicio', '07:00');

      expect(component.form.controls.horarioInicio.valid).toBe(true);
      expect(texto()).not.toContain('As reuniões podem começar');
    });

    it('recusa horário depois de 19h59', () => {
      digitar('horarioInicio', '20:15');

      expect(component.form.controls.horarioInicio.hasError('horarioNaoPermitido')).toBe(true);
    });

    it.each(['0', '-2'])('recusa %s participantes e mostra a mensagem', (valor) => {
      digitar('participantes', valor);

      expect(component.form.controls.participantes.hasError('participantesInvalidos')).toBe(true);
      expect(texto()).toContain('Informe pelo menos um participante.');
    });

    it('recusa número fracionário de participantes', () => {
      digitar('participantes', '2.5');

      expect(component.form.controls.participantes.hasError('participantesInvalidos')).toBe(true);
    });

    it('recusa participantes acima da capacidade da sala', () => {
      preencherFormularioValido();

      digitar('participantes', '9');

      expect(component.form.hasError('capacidadeExcedida')).toBe(true);
      expect(component.form.invalid).toBe(true);
      expect(texto()).toContain('O número de participantes passa da capacidade da sala.');
    });

    it('aceita participantes iguais à capacidade da sala', () => {
      preencherFormularioValido();

      digitar('participantes', '8');

      expect(component.form.valid).toBe(true);
      expect(texto()).not.toContain('passa da capacidade');
    });

    it('revalida a capacidade quando a sala consultada muda', () => {
      digitar('horarioInicio', '09:00');
      digitar('participantes', '6');
      informarSala('AZ-101');
      expect(component.form.valid).toBe(true);

      informarSala('PQ-001', { codigo: 'PQ-001', nome: 'Pequena', capacidade: 4 });

      expect(component.form.hasError('capacidadeExcedida')).toBe(true);
    });

    // O campo de data tem min = hoje; uma data passada não deveria ser aceita.
    it('recusa data anterior a hoje', () => {
      preencherFormularioValido();

      digitar('data', '2026-10-18');

      expect(component.form.controls.data.valid).toBe(false);
      expect(component.form.valid).toBe(false);
    });
  });

  describe('aprovação do gestor', () => {
    beforeEach(() => criar());

    it('avisa quando há mais de 10 participantes', () => {
      digitar('participantes', '11');

      expect(component.exigeAprovacaoGestor()).toBe(true);
      expect(texto()).toContain('Esta reunião precisa de aprovação do gestor.');
    });

    it('não avisa com 10 participantes', () => {
      digitar('participantes', '10');

      expect(component.exigeAprovacaoGestor()).toBe(false);
      expect(texto()).not.toContain('aprovação do gestor');
    });

    it('retira o aviso quando o número volta a 10 ou menos', () => {
      digitar('participantes', '12');
      digitar('participantes', '3');

      expect(component.exigeAprovacaoGestor()).toBe(false);
      expect(texto()).not.toContain('aprovação do gestor');
    });
  });

  describe('reservar', () => {
    beforeEach(() => criar());

    it('não envia quando o formulário é inválido', () => {
      component.reservar();

      expect(salaService.reservar).not.toHaveBeenCalled();
      expect(component.enviando()).toBe(false);
    });

    it('envia a reserva com os valores do formulário', () => {
      preencherFormularioValido();
      component.form.controls.duracaoMinutos.setValue(90);

      enviarFormulario();

      expect(salaService.reservar).toHaveBeenCalledWith({
        codigoSala: 'AZ-101',
        data: '2026-10-19',
        horarioInicio: '09:00',
        duracaoMinutos: 90,
        participantes: 4,
        exigeAprovacaoGestor: false,
      });
    });

    it('envia exigeAprovacaoGestor verdadeiro com mais de 10 participantes', () => {
      informarSala('GR-500', { codigo: 'GR-500', nome: 'Auditório', capacidade: 50 });
      digitar('horarioInicio', '14:00');
      digitar('participantes', '20');

      component.reservar();

      expect(salaService.reservar).toHaveBeenCalledWith(
        expect.objectContaining({ participantes: 20, exigeAprovacaoGestor: true }),
      );
    });

    it('converte participantes e duração para número', () => {
      preencherFormularioValido();
      component.form.controls.participantes.setValue('5' as unknown as number);
      component.form.controls.duracaoMinutos.setValue('30' as unknown as number);

      component.reservar();

      expect(salaService.reservar).toHaveBeenCalledWith(
        expect.objectContaining({ participantes: 5, duracaoMinutos: 30 }),
      );
    });

    it('marca enviando até a resposta e confirma a reserva', () => {
      preencherFormularioValido();

      component.reservar();
      renderizar();
      expect(component.enviando()).toBe(true);

      envios[0].next();
      envios[0].complete();
      renderizar();

      expect(component.enviando()).toBe(false);
      expect(component.reservaConfirmada()).toBe(true);
      expect(component.erroEnvio()).toBe(false);
      expect(texto()).toContain('Reserva enviada.');
    });

    it('mostra erro quando o envio falha', () => {
      preencherFormularioValido();

      component.reservar();
      envios[0].error(new Error('500'));
      renderizar();

      expect(component.enviando()).toBe(false);
      expect(component.reservaConfirmada()).toBe(false);
      expect(component.erroEnvio()).toBe(true);
      expect(texto()).toContain('Não foi possível concluir a reserva. Tente novamente.');
    });

    it('limpa o erro anterior ao tentar de novo', () => {
      preencherFormularioValido();
      component.reservar();
      envios[0].error(new Error('500'));

      component.reservar();
      renderizar();

      expect(component.erroEnvio()).toBe(false);
      expect(texto()).not.toContain('Não foi possível concluir a reserva');
    });

    it('limpa a confirmação anterior ao enviar outra reserva', () => {
      preencherFormularioValido();
      component.reservar();
      envios[0].next();
      envios[0].complete();

      component.reservar();
      renderizar();

      expect(component.reservaConfirmada()).toBe(false);
      expect(texto()).not.toContain('Reserva enviada.');
    });

    // Evita envio duplicado enquanto a primeira requisição não volta.
    it('desabilita o botão enquanto envia', () => {
      preencherFormularioValido();

      component.reservar();
      renderizar();

      expect(component.enviando()).toBe(true);
      expect(botaoReservar().disabled).toBe(true);
    });
  });
});
