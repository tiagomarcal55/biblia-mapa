# Biblia Mapa - Specs e Estado do Produto

Ultima atualizacao: 2026-05-19.

Este documento descreve o estado atual do projeto para continuidade no Antigravity. O app e uma biblioteca pessoal da historia biblica em formato de linha do tempo interativa.

## Stack

- React 19 + TypeScript + Vite.
- Zustand para estado global e persistencia parcial.
- PixiJS para renderizacao da timeline/canvas.
- Lucide React para icones.
- Tailwind esta instalado, mas a UI atual usa majoritariamente estilos inline e variaveis CSS globais.

## Estado Validado

- `npm.cmd run build` passa.
- `npm.cmd run lint` passa.
- O bundle principal ainda passa de 500 kB; Vite mostra apenas warning de tamanho.
- O projeto nesta pasta nao esta inicializado como repositorio Git.

## Superficies Atuais

### Desktop

- Toolbar superior e a entrada principal de acoes.
- Canvas/timeline ocupa a area util livre.
- SidePanel direito abre detalhes da nota selecionada e pode ser redimensionado.
- Minimap fica centralizado na area util do canvas, nao na viewport inteira.
- Editor modal e compartilhado entre criacao e edicao.
- NarrativePlayer continua disponivel como camada flutuante.

### Mobile

- Topbar compacta.
- BottomNav com Linha do Tempo, Busca, Nova Nota, Filtros e Configuracoes.
- Nao ha menu lateral mobile.
- SidePanel vira bottom sheet.
- Minimap compacto fica acima do BottomNav.

## Decisoes de UX/UI Ja Aplicadas

- Sidebar esquerdo foi removido do layout e do codigo

## Regras Para Proximas Edicoes no Antigravity

Seguir `AGENTS.md`:

- HTML/JSX/TSX deve ter estrutura de tags clara e indentada.
- Secoes importantes devem ter `id` ou `className`.
- Evitar fragments em areas editaveis visualmente.
- Envolver grupos logicos em containers.
- Manter textos diretamente editaveis quando fizer sentido para o editor visual.

Regras locais de arquitetura:

- Nao recriar sidebar esquerdo.
- Nao reintroduzir menu lateral mobile.
- Evitar duplicar acoes entre toolbar, footer e paineis.
- Manter a geometria desktop baseada em `--bm-detail-panel-left`.
- Manter `#minimap-track`, `#minimap-viewport`, `#canvas-container` e `#side-panel` como ids estaveis.

## Pendencias Recomendadas

1. Converter mais dados fallback para markdown real em `content/`.
2. Adicionar code splitting para reduzir o bundle principal.
3. Refinar a biblioteca local aberta pelo avatar, principalmente busca/organizacao/importacao.
4. Revisar responsividade do SidePanel em larguras intermediarias.
5. Criar testes automatizados para layout critico:
   - painel fechado
   - painel aberto
   - painel redimensionado
   - minimap navegando
   - zoom/drag respeitando painel direito
6. Revisar encoding dos textos que aparecem corrompidos em alguns arquivos antigos, sem misturar essa limpeza com mudancas funcionais.
7. Avaliar persistencia de notas criadas/editadas e fluxo real de exportacao/importacao.

## Nao Pendentes no Momento

- Remocao do sidebar esquerdo.
- Remocao do menu mobile.
- Consolidacao de filtros na toolbar/footer.
- Drag e zoom basicos da timeline.
- SidePanel direito redimensionavel.
- Minimap centralizado na area util.
- Minimap como controle de navegacao.
- Build e lint.
