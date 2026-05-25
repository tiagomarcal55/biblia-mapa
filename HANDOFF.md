# Turno Finalizado - Antigravity
**Data:** 25 de Maio de 2026

## O que foi estabilizado hoje?
O aplicativo agora atingiu um estado de estabilidade técnica para deploy final.
1. **Persistência Robusta:** Foi introduzido o "Smart Merge" com a flag `_isUserEdited: true`. As notas agora sobrevivem a limpezas de cache de forma inteligente (notas originais se atualizam, notas alteradas pelo usuário são protegidas). O motor de merge está no Hook do `App.tsx`.
2. **Biblioteca Local:** A UI foi refatorada (`DesktopToolbarPanel/index.tsx`). O painel da biblioteca agora hospeda os botões de Importação e Exportação (que estavam em configurações) e renderiza uma lista "scrollável" das notas pessoais (`_isUserEdited: true`), com botões que teletransportam a câmera para o evento selecionado.
3. **Encoding:** Nenhuma falha de charset restante na base de dados bíblica.
4. **Code Splitting (Vite):** Inserimos `manualChunks` no `vite.config.ts` fatiando a inicialização do app (pixi-vendor, react-vendor, lucide) para resolver o bundle size excesivo.

## Para a próxima IA:
- O painel de navegação móvel (`BottomNav` e `MobileTabSheet`) já funciona corretamente. A arquitetura de interface está **consolidada**, e os componentes legados de "mockups sem função" foram expurgados.
- Se for iniciar um novo sprint de funcionalidades, **não** reconstrua o Sidebar esquerdo. O layout principal agora se concentra na Toolbar superior que abre gavetas descendentes (`DesktopToolbarPanel`).
- **NÃO** altere a lógica de carregamento no `App.tsx` (linhas 37 a 60) a menos que tenha instruções explícitas do usuário para alterar a engine de persistência, pois o *Spread Operator* faz o deep merge perfeito de nós originais e editados pelo usuário.
- **Sincronização Nuvem Oficial:** Foi implementada uma arquitetura Serverless baseada em **GitHub Gists (via PAT Token)** que mora em `DesktopToolbarPanel`. O usuário loga com o Token e a função `syncCloud()` no Zustand faz o merge. **NÃO migre** para Supabase/Firebase, pois o usuário deseja soberania de dados 100% gratuita.

## Tarefas em Aberto (`SPECS.md`)
O `SPECS.md` foi exaurido. O projeto está tecnicamente completo dentro do escopo estabelecido. A próxima fase deve ser a adição massiva de eventos bíblicos via interface.

---

# Atualizacao Codex - Theme Engine e refinamento UI
**Data:** 25 de Maio de 2026

## O que foi alterado neste turno

1. **Theme Engine global**
   - Criado `src/lib/themes.ts` com 6 temas e helpers:
     - `mesh-dark`
     - `mesh-light`
     - `cartography-dark`
     - `cartography-light`
     - `papyrus-dark`
     - `papyrus-light`
   - `src/types/index.ts` ganhou o tipo `ThemeId`.
   - `src/store/timeline.store.ts` agora persiste `settings.theme` como `ThemeId`, normaliza valores legados `dark/light` e mantem o tema salvo permanentemente.
   - `src/main.tsx` aplica o tema persistido no `<html data-theme="...">` antes do React montar, para evitar flash/reload inconsistente.
   - `src/App.tsx` aplica `normalizeTheme(settings.theme)` no `<html>` e usa `var(--app-background)` como fundo do app.
   - `src/index.css` define variaveis por `data-theme`, incluindo `--app-background`, `--bg-texture`, cores de painel, texto, bordas e glass.

2. **Seletor visual de temas**
   - `src/components/DesktopToolbarPanel/index.tsx` recebeu uma grade visual com os 6 temas dentro da aba Configuracoes.
   - Cada card troca o tema em tempo real via `updateSettings({ theme: option.id })`.
   - A UI antiga de apenas claro/escuro foi substituida no desktop.

3. **Compatibilidade com Pixi/canvas**
   - `src/engine/TimelineEngine.ts` agora deriva apenas o modo (`dark` ou `light`) via `getThemeMode()` para cores internas da timeline.
   - O canvas Pixi foi configurado com `backgroundAlpha: 0`.
   - Adicionado `setRendererThemeBackground()` para manter o renderer/canvas transparente durante trocas de tema.
   - `src/components/Canvas/index.tsx` forca `background: transparent`.

4. **ArticleReader**
   - `src/components/ArticleReader/index.tsx` usa `getThemeMode()` para continuar aplicando paleta clara/escura mesmo com os novos IDs de tema.

5. **Refinamento UI anterior, ainda relevante**
   - `src/index.css` recebeu classes compartilhadas: `bm-control`, `bm-soft-button`, `bm-primary-button`, `bm-chip`.
   - Toolbar, SidePanel, Editor, Minimap, BottomNav e DesktopToolbarPanel foram parcialmente padronizados para botoes, bordas, raios e tipografia.

## Validado

- `npm.cmd run build` passa.
- `npm.cmd run lint` passa, com os mesmos 5 warnings antigos.
- No browser, `cartography-dark` e `papyrus-dark` aparecem corretamente com textura/background apos troca e reload.
- O canvas esta transparente (`backgroundColor: rgba(0, 0, 0, 0)`) e nao deveria mais cobrir o fundo.

## Pendencia imediata para o proximo agente

O usuario reportou que **4 temas ainda nao mostram as texturas corretamente**:

- `mesh-dark`
- `mesh-light`
- `cartography-light`
- `papyrus-light`

Os dois temas que funcionam bem visualmente sao:

- `cartography-dark`
- `papyrus-dark`

Hipoteses provaveis:

1. Os temas Mesh podem estar tecnicamente carregando gradientes, mas visualmente parecem solidos por contraste baixo demais.
2. Os temas `cartography-light` e `papyrus-light` podem estar com textura clara demais sobre fundo claro, ficando quase invisivel.
3. Como `#app-root`, `#bg-gradient` e `body` agora usam `--app-background`, o problema restante provavelmente esta nos valores de `--bg-texture`/opacidade/contraste em `src/index.css`, nao na arquitetura.

Proxima acao recomendada:

- Ajustar somente `src/index.css`, aumentando contraste/opacidade das camadas de textura dos 4 temas pendentes.
- Para Mesh, adicionar padroes discretos visiveis alem dos radiais, ou aumentar bastante a presenca dos gradientes.
- Para Cartografia/Papiro Light, escurecer `stroke-opacity`/grain opacity e validar em browser com screenshot.

## Nao mexer

- Nao alterar `syncCloud`.
- Nao alterar Smart Merge em `App.tsx`.
- Nao recriar sidebar esquerdo.
- Nao migrar Cloud Sync para Supabase/Firebase.
