export interface Sala {
  codigo: string;
  nome: string;
  capacidade: number;
}

export interface Reserva {
  codigoSala: string;
  data: string;
  horarioInicio: string;
  duracaoMinutos: number;
  participantes: number;
  exigeAprovacaoGestor: boolean;
}
