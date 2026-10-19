# Decisões de configuração

Registro das decisões de ferramentas deste repositório e dos arquivos-fonte lidos para tomá-las. Data da montagem: 2026-10-19.

## Ambiente

| Ferramenta | Versão |
|---|---|
| Node.js | 24.16.0 |
| pnpm | 12.11.2 |
| Angular CLI | 22.2.3 (`pnpm view @angular/cli@22 version`) |
| @angular/core, common, forms, router, platform-browser, compiler, compiler-cli, build | 22.2.3 |
| TypeScript | 6.0.3 |
| rxjs | 7.8.2 |
| jest | 30.5.2 |
| jest-preset-angular | 17.0.3 |
| ts-jest (dependência transitiva do preset) | 29.4.15 |
| @jest/environment-jsdom-abstract (transitiva do preset) | 30.5.2 |
| jsdom | 30.1.3 (já instalado pelo CLI; mantido) |
| @types/jest | 30.0.0 |

## Etapa 1 — Jest no lugar do Vitest

### Criação do projeto

`pnpm dlx @angular/cli@22.2.3 new reserva-salas-poc --package-manager pnpm --defaults`. O CLI gerou o projeto com Vitest (`vitest@^5`, builder `@angular/build:unit-test`) e sem `zone.js` nas dependências.

O pnpm 12 recusou scripts de instalação não aprovados (`ERR_PNPM_IGNORED_BUILDS`). Foram aprovados explicitamente, com `pnpm approve-builds <pacote>`, apenas os pacotes nativos usados pelo build do Angular e pelo resolvedor do Jest: `esbuild`, `lmdb`, `msgpackr-extract`, `@parcel/watcher`, `unrs-resolver`. A lista fica em `pnpm-workspace.yaml` (`allowBuilds`).

### Escolha das versões

Lidas no registro com `pnpm view`:

- `jest-preset-angular@17.0.3` (tag `latest`) declara `peerDependencies`: `jest ^30.0.0`, `jsdom >=26.0.0`, `typescript >=5.8`, `@angular/core|compiler-cli|platform-browser >=20.0.0 <23.0.0`. Compatível com Angular 22.2.3 e TypeScript 6.0.3.
- `jest@30.5.2` (tag `latest`) satisfaz `^30.0.0`.
- `ts-jest@29.4.15`, dependência do preset, declara `typescript >=4.3 <7`, compatível com TypeScript 6.
- **`jest-environment-jsdom` não foi instalado.** O preset tem dependência direta de `@jest/environment-jsdom-abstract` e traz o próprio ambiente (ver abaixo), que usa o `jsdom` do projeto. `jest-environment-jsdom@30.5.2` fixaria `jsdom ^26.1.0` como dependência própria, duplicando o jsdom sem necessidade.

### Arquivos-fonte lidos (`node_modules/jest-preset-angular`)

- `package.json`: sem campo `exports`, então os subcaminhos `presets`, `setup-env/zoneless` e `environments/jest-jsdom-env` são resolvíveis por `require`.
- `jest-preset.js`, `presets/index.js`, `build/presets/index.js`, `build/presets/create-cjs-preset.js`, `build/presets/utils.js`: `createCjsPreset()` devolve `testEnvironment: 'jsdom'`, `moduleFileExtensions`, `snapshotSerializers`, `transformIgnorePatterns` e o `transform` de `ts|js|mjs|html|svg` com `tsconfig: '<rootDir>/tsconfig.spec.json'`. O valor `'jsdom'` faria o Jest procurar o pacote `jest-environment-jsdom`, que não está instalado; por isso `testEnvironment` é sobrescrito.
- `environments/jest-jsdom-env.js` e `build/environments/jest-jsdom-env.js`: subclasse de `@jest/environment-jsdom-abstract` que recebe o módulo `jsdom` do projeto. É o ambiente usado.
- `setup-env/zoneless/index.js` e `index.d.mts`: exporta `setupZonelessTestEnv(options?)`, que chama `getTestBed().initTestEnvironment` com `provideZonelessChangeDetection()` e um `ErrorHandler` que relança erros. Também existe `setup-env/zone`, que não se aplica.
- `setup-env/utils.js`: `polyfillEncoder` e leitura de opções.
- `build/ng-jest-transformer.js` e `build/config/ng-jest-config.js`: o transformer estende `TsJestTransformer` e ajusta opções do compilador (`allowJs`, `noEmitOnError: false` etc.).

Também lidos:

- `jest-config/build/index.js` (30.5.2): ordem de busca de configuração `.js, .ts, .mjs, .mts, .cjs, .cts, .json`; arquivos `.ts` exigem `ts-node` ou suporte nativo do Node. Por isso a configuração é `jest.config.cjs`, carregada por `require` sem transpilar.
- `ts-jest/dist/legacy/config/config-set.js`, `_getAndResolveTsConfig`: emite o aviso TS151001 quando `module` não é `CommonJS`/`Node16`/`NodeNext` e não há `esModuleInterop`. O `tsconfig.json` base usa `module: preserve`; o `tsconfig.spec.json` define `module: commonjs`, o que elimina o aviso (verificado com `--no-cache`).
- `@angular/core/fesm2022/_debug_node-chunk.mjs`: `onPush: componentDefinition.changeDetection !== ChangeDetectionStrategy.Eager`. No Angular 22, componentes sem `changeDetection` explícito são OnPush.

### Zoneless

O projeto gerado não tem `zone.js` em `package.json` nem em `angular.json` (`polyfills` ausente), e `app.config.ts` não chama `provideZoneChangeDetection`. É zoneless. O `setup-jest.ts` chama `setupZonelessTestEnv()`.

### Configuração única

- `jest.config.cjs` é a única configuração do Jest. `pnpm test` (`jest`) e `pnpm test:cobertura` (`jest --coverage`) a usam.
- Sem watch: o Jest só entra em watch com `--watch`/`--watchAll`.
- O target `test` foi removido de `angular.json` (o builder `@angular/build:unit-test` usava Vitest). `ng test` não é usado.
- **`@angular-builders/jest` não foi adotado.** A versão `22.0.1` declara `peerDependencies` em `@angular-devkit/build-angular` e `@angular/platform-browser-dynamic`, que o projeto não usa. Instalar esses pacotes só para ter `ng test` acrescentaria um segundo caminho de execução sem necessidade.
- `vitest` removido de `devDependencies`; `tsconfig.spec.json` passou de `vitest/globals` para `jest`. As entradas `ng test` de `.vscode/` foram removidas.

## Etapa 2 — Aplicação

- Componentes standalone, signals, reactive forms tipados e o novo controle de fluxo do template.
- `RELOGIO` (`src/app/reserva/relogio.ts`) é um `InjectionToken<() => Date>` com fábrica padrão `() => new Date()`. É usado para a data inicial do formulário.
- `SalaService` também expõe `reservar()` (`POST /api/salas/{codigo}/reservas`), que é o envio do formulário.
- Os arquivos da feature foram escritos à mão, sem `ng generate`, então nenhum spec foi gerado para eles. O único spec do repositório é `src/app/app.spec.ts`, ajustado ao novo título.
- `app.html` foi reduzido a título e `router-outlet`; a rota vazia carrega `ReservaComponent` sob demanda.
