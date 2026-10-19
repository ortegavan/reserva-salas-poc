# reserva-salas-poc

Aplicação Angular de reserva de salas de reunião. O formulário recebe o código da sala, a data, o horário de início, a duração e o número de participantes, consulta os dados da sala e envia a reserva. As regras de negócio são fictícias.

## Comandos

```bash
pnpm install
pnpm start             # servidor de desenvolvimento (ng serve)
pnpm build             # build de produção
pnpm test              # Jest, sem watch
pnpm test:cobertura    # Jest com cobertura (saída em coverage/)
```

Os testes rodam com Jest e `jest-preset-angular`. Existe um único arquivo de configuração, `jest.config.cjs`, usado por todos os comandos de teste.

A aplicação consome `GET /api/salas/{codigo}` e `POST /api/salas/{codigo}/reservas`; não há backend neste repositório.

Detalhes da configuração de ferramentas estão em [`docs/decisoes.md`](docs/decisoes.md).
