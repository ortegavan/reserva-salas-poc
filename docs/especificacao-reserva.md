# Especificação — reserva de salas de reunião

O formulário de reserva tem os campos: código da sala, data, horário de início, duração e número de participantes. Ao informar o código, a aplicação consulta os dados da sala (nome e capacidade).

## Regras de negócio

- **R1.** A reunião precisa ter pelo menos um participante.
- **R2.** O código da sala segue o formato de duas letras maiúsculas, hífen e três dígitos (exemplo: `AZ-101`). Códigos com mais ou menos caracteres são inválidos.
- **R3.** O número de participantes não pode passar da capacidade da sala.
- **R4.** Reuniões a partir de 10 participantes (inclusive) exigem aprovação do gestor.
- **R5.** O horário de início permitido vai das 07h00 às 19h59. Às 20h00 já não é possível iniciar uma reunião.
- **R6.** O botão "Reservar" fica desabilitado enquanto o formulário estiver inválido ou enquanto um envio estiver em andamento, para evitar reserva duplicada.
- **R7.** Ao alterar o código da sala, o nome e a capacidade da sala anterior devem sumir imediatamente e o texto "Consultando sala…" deve aparecer até a nova consulta responder.
