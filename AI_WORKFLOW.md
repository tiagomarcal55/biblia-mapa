# Diretrizes de Trabalho em Equipe para IAs (Antigravity, Cursor, Codex)

**Propósito:** Este projeto é desenvolvido em "turnos" rotativos por diferentes Inteligências Artificiais. Para evitar que o trabalho seja desfeito ou sobreposto, TODOS os agentes devem seguir as regras abaixo estritamente.

---

## 1. Regra de Ouro (Início do Turno)
Ao iniciar uma interação neste projeto, a PRIMEIRA AÇÃO da IA deve ser **LÊR OS ARQUIVOS DE CONTEXTO**:
- `HANDOFF.md`: Contém o resumo do que o agente anterior fez, as últimas modificações de código e qual era a estabilidade do sistema até a troca de turno.
- `SPECS.md`: Contém a lista de tarefas pendentes, bugs conhecidos e funcionalidades mockadas que precisam ser resolvidas.

> **Comando mental para a IA:** "Eu não devo alterar código sem antes ler o HANDOFF.md para entender em que ponto o colega anterior parou."

## 2. Regra de Prata (Fim do Turno)
Quando a IA for avisada pelo usuário que os tokens estão acabando, ou ao concluir uma grande funcionalidade, a ÚLTIMA AÇÃO da IA deve ser **ATUALIZAR O `HANDOFF.md`**:
1. Registrar a data e a hora da atualização.
2. Listar quais arquivos específicos foram modificados.
3. Descrever a lógica do que foi resolvido e os cuidados que a próxima IA deve ter.
4. Mover as tarefas concluídas do `SPECS.md` para o histórico.

## 3. Diretrizes de Arquitetura e Código
- **Não reverta soluções complexas sem permissão:** Se encontrar uma injeção de CSS estranha (como no Leitor de Artigos do JW.org) ou um cálculo de limites no Canvas (PIXI.js), saiba que isso foi construído com esforço para resolver um problema específico. Não refatore "para ficar mais limpo" se isso for quebrar o que o agente anterior estabilizou.
- **Evite novas bibliotecas:** O projeto já tem sua stack definida (React, Vite, Zustand, PixiJS). Tente resolver os problemas usando Vanilla JS e as ferramentas já instaladas no `package.json`.
- **Zustand é a fonte da verdade:** Qualquer estado global que dita regras para o PIXI.js (`TimelineEngine`) deve passar obrigatoriamente pela store (`timeline.store.ts`).

## 4. Estrutura de Informações
- Credenciais e segredos de APIs devem ficar no `.env` (nunca hardcoded).
- Instruções de Deploy e Infraestrutura devem ser consultadas e salvas no `README.md`.
