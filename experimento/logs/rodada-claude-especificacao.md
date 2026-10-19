Date: 2024-06-05 15:30:00
Model: Default (Opus 5.5 · Best for everyday, complex tasks)

Criei os três arquivos de teste e rodei a suíte com o Jest do projeto. O resultado é estável: em três execuções seguidas deu sempre 87 testes passando e 16 falhando, os mesmos 16 a cada vez. Os 2 testes que já existiam continuam passando.

Analisei cada falha e todas vêm de diferenças entre o código de produção e a especificação, não de erro nos testes. Seguindo o que você pediu, não corrigi o código e mantive os testes que falham. Só criei os três .spec.ts; nenhum outro arquivo foi alterado.

Arquivos criados

- src/app/reserva/regras-reserva.service.spec.ts: testa cada regra de R1 a R5, incluindo os valores no limite de cada uma.
- src/app/reserva/sala.service.spec.ts: confere o GET de consulta e o POST de reserva (URL, corpo da requisição, caracteres especiais no código e repasse de erros).
- src/app/reserva/reserva.component.spec.ts: cobre o estado inicial, a consulta da sala (inclusive a espera de 300 ms, sala não encontrada e respostas antigas descartadas), as regras R1 a R7 na tela, o envio da reserva e as mensagens de sucesso e erro.

Diferenças entre o código e a especificação

┌───────┬──────────────────────────────┬──────────────────────────────────────────────────────────────────────────────┬───────────────┐
│ Regra │ Onde │ O que acontece │ Testes que │
│ │ │ │ falham │
├───────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┼───────────────┤
│ │ │ A validação confere só o início do código. Por isso, códigos com caracteres │ 3 no service, │
│ R2 │ regras-reserva.service.ts:3 │ a mais são aceitos, como AZ-1012, AZ-101X e AZ-101 (com espaço no final). │ 1 no │
│ │ │ │ componente │
├───────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┼───────────────┤
│ │ │ A aprovação do gestor só é exigida a partir de 11 participantes, e a regra │ 1 no service, │
│ R4 │ regras-reserva.service.ts:20 │ diz "a partir de 10, inclusive". Com 10 participantes, o aviso não aparece e │ 2 no │
│ │ │ a reserva vai com exigeAprovacaoGestor: false. │ componente │
├───────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┼───────────────┤
│ │ │ Qualquer horário da faixa das 20h é aceito, de 20:00 a 20:59. Pela regra, às │ 3 no service, │
│ R5 │ regras-reserva.service.ts:29 │ 20:00 já não se pode iniciar uma reunião. │ 2 no │
│ │ │ │ componente │
├───────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┼───────────────┤
│ │ │ A condição do botão está invertida: ele só fica desabilitado quando o │ │
│ R6 │ reserva.component.html:58 │ formulário está inválido e não há envio em andamento. Assim, o botão │ 3 no │
│ │ │ continua clicável durante o envio. Além disso, o método reservar() não │ componente │
│ │ │ impede um segundo envio, então duas chamadas seguidas geram duas reservas. │ │
├───────┼──────────────────────────────┼──────────────────────────────────────────────────────────────────────────────┼───────────────┤
│ │ │ Ao trocar o código, a tela continua mostrando o nome e a capacidade da sala │ 1 no │
│ R7 │ reserva.component.ts:79-82 │ anterior até a nova consulta responder. O texto "Consultando sala…" não │ componente │
│ │ │ chega a aparecer, porque a sala antiga não é apagada na troca. │ │
└───────┴──────────────────────────────┴──────────────────────────────────────────────────────────────────────────────┴───────────────┘

Quando o código de produção for corrigido, os 16 testes devem passar sem precisar mudar nada neles.
