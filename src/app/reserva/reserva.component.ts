import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { catchError, debounceTime, finalize, of, switchMap, tap } from 'rxjs';
import { RegrasReservaService } from './regras-reserva.service';
import { RELOGIO } from './relogio';
import { Sala } from './sala';
import { SalaService } from './sala.service';

function formatarData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

@Component({
  selector: 'app-reserva',
  imports: [ReactiveFormsModule],
  templateUrl: './reserva.component.html',
  styleUrl: './reserva.component.css',
})
export class ReservaComponent {
  private readonly regras = inject(RegrasReservaService);
  private readonly salaService = inject(SalaService);
  private readonly relogio = inject(RELOGIO);

  readonly duracoes = [30, 60, 90, 120];
  readonly hoje = formatarData(this.relogio());

  readonly sala = signal<Sala | null>(null);
  readonly consultandoSala = signal(false);
  readonly salaNaoEncontrada = signal(false);
  readonly enviando = signal(false);
  readonly reservaConfirmada = signal(false);
  readonly erroEnvio = signal(false);

  readonly form = new FormGroup(
    {
      codigoSala: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, (c) => this.validarCodigoSala(c)],
      }),
      data: new FormControl(this.hoje, { nonNullable: true, validators: [Validators.required] }),
      horarioInicio: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, (c) => this.validarHorarioInicio(c)],
      }),
      duracaoMinutos: new FormControl(60, { nonNullable: true, validators: [Validators.required] }),
      participantes: new FormControl(1, {
        nonNullable: true,
        validators: [Validators.required, (c) => this.validarParticipantes(c)],
      }),
    },
    { validators: () => this.validarCapacidade() },
  );

  private readonly participantes = toSignal(this.form.controls.participantes.valueChanges, {
    initialValue: this.form.controls.participantes.value,
  });

  readonly exigeAprovacaoGestor = computed(() =>
    this.regras.exigeAprovacaoGestor(Number(this.participantes())),
  );

  constructor() {
    this.form.controls.codigoSala.valueChanges
      .pipe(
        tap(() => {
          this.salaNaoEncontrada.set(false);
          this.consultandoSala.set(true);
        }),
        debounceTime(300),
        switchMap((codigo) =>
          this.regras.codigoSalaValido(codigo)
            ? this.salaService.consultar(codigo).pipe(catchError(() => of(null)))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((sala) => {
        this.sala.set(sala);
        this.salaNaoEncontrada.set(sala === null && this.form.controls.codigoSala.valid);
        this.consultandoSala.set(false);
        this.form.updateValueAndValidity();
      });
  }

  reservar(): void {
    if (this.form.invalid) {
      return;
    }
    const valor = this.form.getRawValue();
    this.enviando.set(true);
    this.reservaConfirmada.set(false);
    this.erroEnvio.set(false);
    this.salaService
      .reservar({
        ...valor,
        participantes: Number(valor.participantes),
        duracaoMinutos: Number(valor.duracaoMinutos),
        exigeAprovacaoGestor: this.exigeAprovacaoGestor(),
      })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => this.reservaConfirmada.set(true),
        error: () => this.erroEnvio.set(true),
      });
  }

  private validarCodigoSala(controle: AbstractControl<string>): ValidationErrors | null {
    if (!controle.value) {
      return null;
    }
    return this.regras.codigoSalaValido(controle.value) ? null : { formatoCodigoSala: true };
  }

  private validarHorarioInicio(controle: AbstractControl<string>): ValidationErrors | null {
    if (!controle.value) {
      return null;
    }
    return this.regras.horarioInicioPermitido(controle.value) ? null : { horarioNaoPermitido: true };
  }

  private validarParticipantes(controle: AbstractControl<number>): ValidationErrors | null {
    return this.regras.participantesValidos(Number(controle.value))
      ? null
      : { participantesInvalidos: true };
  }

  private validarCapacidade(): ValidationErrors | null {
    const sala = this.sala();
    if (!sala) {
      return { salaNaoConsultada: true };
    }
    const participantes = Number(this.form.controls.participantes.value);
    return this.regras.cabeNaSala(participantes, sala.capacidade) ? null : { capacidadeExcedida: true };
  }
}
