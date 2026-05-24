# Biblia Mapa - Handoff Para Antigravity

Ultima atualizacao: 2026-05-19.

Este handoff resume o que esta pronto, como a logica principal esta organizada e quais proximas etapas fazem sentido. Use `SPECS.md` como documento complementar de requisitos e estado do produto.

## Resumo Executivo

Biblia Mapa e uma biblioteca cronologica da historia biblica. A experiencia principal e uma timeline PixiJS com notas/eventos, filtros, busca, painel de detalhes, editor e minimap.

O projeto foi simplificado: o sidebar esquerdo foi removido e a toolbar desktop passou a ser a superficie principal. No mobile, nao existe menu lateral; o footer abre as funcoes principais.

## Validacao Atual

Comandos validados:

```powershell
npm.cmd run build
npm.cmd run lint
```

Resultado:

- Build passa.
- Lint passa.
- Vite ainda alerta que o chunk principal passa de 500 kB. Isto e warning conhecido, nao erro.

Observacao: esta pasta nao esta como repositorio Git, entao nao ha `git diff`/commit local disponivel neste workspace.

## Arquivos Principais

- `src/App.tsx`: composicao do layout desktop/mobile, toolbar, side panel, minimap, editor e sheets mobile.
- `src/index.css`: variaveis globais de tema, tokens compartilhados e `--bm-detail-panel-left`.
- `src/store/timeline.store.ts`: Zustand, filtros, selecao, camera, settings e metricas.
- `src/types/index.ts`: contratos de dados e store.
- `src/engine/TimelineEngine.ts`: PixiJS, camera, desenho dos nos/ticks/lanes, input de mouse/scroll
   - padronizar descricoes, tags, referencias e links.

3. Testes automatizados:
   - criar testes de layout para canvas/minimap/painel.
   - validar drag, zoom, resize e filtros.
   - validar mobile com footer e sheets.

4. Biblioteca Local:
   - melhorar painel aberto pelo avatar.
   - adicionar busca/contagem/organizacao.
   - definir fluxo real de importacao/exportacao.

5. Persistencia e editor:
   - revisar como notas criadas/editadas devem ser salvas.
   - decidir se a persistencia atual em localStorage e suficiente.

6. Encoding:
   - alguns arquivos antigos mostram textos corrompidos por encoding.
   - fazer limpeza separada, sem misturar com mudancas funcionais.

7. UX refinada:
   - revisar tamanhos e contraste em tema claro/escuro.
   - validar textos em viewports menores.
   - revisar comportamento do SidePanel maximizado.

## Cuidados Para Continuar

- Siga `AGENTS.md` ao editar JSX/TSX para manter compatibilidade com o Antigravity Visual Editor.
- Preserve ids estaveis usados por validacao e layout.
- Nao reintroduza sidebar esquerdo ou menu lateral mobile.
- Antes de mexer em timeline/canvas, entenda `TimelineEngine.ts`, `Camera.ts`, `Minimap/index.tsx` e `SidePanel/index.tsx`.
- Depois de mudancas visuais relevantes, rode:

```powershell
npm.cmd run build
npm.cmd run lint
```

## Estado Pronto Para Retorno

O app esta em estado funcional para continuar no Antigravity:

- layout principal consolidado;
- timeline interativa funcionando;
- filtros e busca ligados ao estado;
- painel de detalhes redimensionavel;
- minimap funcional e sincronizado com area util;
- mobile sem redundancia de menu/sidebar;
- documentacao atualizada para proxima etapa.
