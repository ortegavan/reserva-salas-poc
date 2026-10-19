# Protocolo de geração das suítes

Este procedimento vale para a autora do experimento e para qualquer pessoa que queira reproduzi-lo com outra ferramenta de IA. O objetivo é que a ferramenta gere testes vendo **apenas** o código da aplicação (e, numa das variantes, a especificação), sem nenhum outro contexto.

Este protocolo e os prompts fixos ficam **só na branch `experimento`**. As branches de geração (`main` e `base-com-especificacao`) contêm apenas a aplicação, e o clone usado para gerar os testes é sempre `--depth 1 --single-branch` de uma delas. Assim a ferramenta não enxerga este protocolo, os prompts, nenhuma outra branch nem o histórico de commits.

Existem duas variantes:

| Variante | Branch base do clone de geração | Prompt (copiado da branch `experimento`) | Branch da rodada |
|---|---|---|---|
| Só código | `main` | `experimento/prompts/so-codigo.md` | `rodada/<ferramenta>-codigo` |
| Código + especificação | `base-com-especificacao` | `experimento/prompts/codigo-e-especificacao.md` | `rodada/<ferramenta>-especificacao` |

`<ferramenta>` é um nome curto, em minúsculas e sem espaços (por exemplo `claude-code`, `copilot`, `cursor`). Cada variante é uma rodada separada, com clone e sessão próprios.

## Pré-requisitos

- Node.js 22 ou superior e pnpm (a versão está em `packageManager`, no `package.json`).
- Git.

## Passo a passo

### 1. Clonar somente a branch base, num diretório novo

Use um diretório que nunca tenha sido aberto por uma sessão de IA. Algumas ferramentas guardam memória ou histórico por caminho de pasta.

O clone de geração é **sempre** `git clone --depth 1 --single-branch` da `main` ou da `base-com-especificacao`: só a branch base e só o último commit. Nunca clone sem essas duas opções, nunca clone a branch `experimento` nesse diretório e não rode `git fetch` de outras branches nem `git fetch --unshallow` dentro dele.

```bash
# variante "só código"
git clone --depth 1 --single-branch --branch main <url-do-repositorio> <pasta-nova>

# variante "código + especificação"
git clone --depth 1 --single-branch --branch base-com-especificacao <url-do-repositorio> <pasta-nova>

cd <pasta-nova>
```

### 2. Conferir o que a ferramenta vai enxergar

```bash
git branch -a
```

Deve aparecer só a branch clonada (local e `remotes/origin/<branch>`). Nenhuma outra; em particular, nem `experimento` nem `remotes/origin/experimento`.

```bash
git log --oneline
```

Deve aparecer um único commit.

```bash
find . -path ./node_modules -prune -o \( -iname 'CLAUDE.md' -o -iname 'AGENTS.md' -o -iname 'GEMINI.md' \
  -o -name '.cursorrules' -o -name '.windsurfrules' -o -name 'copilot-instructions.md' \
  -o -name '.claude' -o -name '.cursor' -o -name '.github' -o -name 'experimento' \) -print
```

O comando não deve imprimir nada. Se imprimir, pare e não use esse clone.

Confira também as instruções e memórias **globais** da ferramenta (por exemplo, `~/.claude/CLAUDE.md` no Claude Code ou regras de usuário em outros editores). Elas não podem mencionar este experimento nem esta aplicação. Se mencionarem, desative-as durante a rodada.

Instale as dependências e confirme que a base roda verde:

```bash
pnpm install
pnpm test
```

### 3. Criar a branch da rodada

```bash
git switch -c rodada/<ferramenta>-codigo          # variante "só código"
git switch -c rodada/<ferramenta>-especificacao   # variante "código + especificação"
```

### 4. Abrir a ferramenta numa sessão nova e colar o prompt fixo

- Abra a ferramenta **dentro de `<pasta-nova>`**, numa sessão nova, sem histórico de conversa.
- Copie o prompt da variante **da branch `experimento`**, fora da pasta de geração: pelo GitHub ([`so-codigo.md`](https://github.com/ortegavan/reserva-salas-poc/blob/experimento/experimento/prompts/so-codigo.md), [`codigo-e-especificacao.md`](https://github.com/ortegavan/reserva-salas-poc/blob/experimento/experimento/prompts/codigo-e-especificacao.md)) ou de um clone separado dessa branch, em outro diretório. Não copie o arquivo para dentro de `<pasta-nova>`.
- Cole o prompt **sem nenhuma alteração**, nem acréscimos antes ou depois.
- Não dê instruções adicionais durante a sessão. Se a ferramenta pedir permissão para rodar comandos ou editar arquivos, conceda; se fizer uma pergunta, responda apenas "Siga o prompt original.".
- Deixe a ferramenta trabalhar até declarar que terminou.

### 5. Registrar o resultado

1. Confira que só arquivos `.spec.ts` foram alterados ou criados:

   ```bash
   git status --short
   ```

   Se a ferramenta alterou outro arquivo, registre isso no log (item 3 abaixo) e descarte a alteração com `git checkout -- <arquivo>` antes do commit.

2. Commite a suíte final:

   ```bash
   git add -- '*.spec.ts'
   git commit -m "Rodada <ferramenta>: suíte gerada (<variante>)"
   ```

3. Salve a resposta final da ferramenta, **integralmente**, incluindo a lista de divergências que ela apontou, em `experimento/logs/<branch>.md`. Como o nome da branch tem `/`, o arquivo fica em subpasta: por exemplo `experimento/logs/rodada/claude-code-codigo.md`. No topo do arquivo, registre:

   ```markdown
   - Ferramenta: <nome da ferramenta>
   - Versão da ferramenta: <versão>
   - Modelo: <nome e versão do modelo, se a ferramenta informar>
   - Data: <AAAA-MM-DD>
   - Variante: só código | código + especificação
   - Observações: <arquivos fora de .spec.ts que a ferramenta tentou alterar, interrupções, erros>
   ```

   A pasta `experimento/logs/` não existe na branch da rodada. Crie-a **só depois de encerrar a sessão da ferramenta**:

   ```bash
   mkdir -p experimento/logs/rodada
   # salve o log em experimento/logs/rodada/<ferramenta>-<variante>.md
   git add experimento/logs
   git commit -m "Rodada <ferramenta>: log da sessão (<variante>)"
   ```

### 6. Contribuir com o experimento

```bash
git push -u origin rodada/<ferramenta>-codigo
```

Abra um pull request no repositório da aplicação a partir da branch da rodada. O pull request não será mesclado na `main`; ele serve para que a branch seja medida.

## O que acontece depois

As suítes são medidas fora deste repositório, num clone temporário de cada branch de rodada. Este repositório não contém o material de medição.
