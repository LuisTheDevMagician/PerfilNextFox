# Elysia WS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir Node HTTP + Socket.IO por Elysia + @elysiajs/ws no backend, e socket.io-client por WebSocket nativo no frontend, mantendo comportamento idêntico do jogo.

**Architecture:** O backend vira um único app Elysia com rotas REST (`/api/disciplinas`, `/api/temas`, `/api/cartas`) e endpoint WebSocket em `/ws`. Um `Map<UUID, ServerWebSocket>` + `WeakMap` permitem broadcast e envio direcionado sem abstrações do Socket.IO. O frontend exporta uma classe `WsClient` com a mesma API `.on/.emit/.off`, minimizando mudanças nas páginas.

**Tech Stack:** Elysia (já instalado), @elysiajs/ws (novo), @elysiajs/cors (já instalado) — backend; WebSocket nativo do browser — frontend.

---

### Task 1: Atualizar dependências do backend

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Remover socket.io e adicionar @elysiajs/ws**

Editar `backend/package.json` — substituir `"socket.io"` por `"@elysiajs/ws"` nas dependências:

```json
{
  "name": "backend",
  "version": "1.0.50",
  "packageManager": "bun@1.0.0",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir ./dist",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "@elysiajs/cors": "latest",
    "@elysiajs/ws": "latest",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "drizzle-orm": "^0.45.2",
    "elysia": "latest"
  },
  "devDependencies": {
    "bun-types": "latest",
    "drizzle-kit": "^0.31.10"
  },
  "module": "src/index.js"
}
```

- [ ] **Step 2: Instalar dependências**

```bash
cd backend && bun install
```

Resultado esperado: lock file atualizado, `@elysiajs/ws` presente em `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/bun.lock
git commit -m "chore(backend): replace socket.io with @elysiajs/ws"
```

---

### Task 2: Atualizar dependências do frontend

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Remover socket.io e socket.io-client**

Editar `frontend/package.json` — remover `"socket.io"` e `"socket.io-client"` das dependências:

```json
{
  "name": "quiz",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "bun@1.0.0",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@mui/icons-material": "^7.3.9",
    "@mui/material": "^7.3.9",
    "next": "16.2.1",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "tsx": "^4.19.2",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```bash
cd frontend && bun install
```

Resultado esperado: `socket.io-client` removido do `node_modules`.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "chore(frontend): remove socket.io-client"
```

---

### Task 3: Criar `backend/src/ws.ts`

**Files:**
- Create: `backend/src/ws.ts`
- (Substitui `backend/src/socket.ts` — não deletar ainda, será feito na Task 5)

- [ ] **Step 1: Criar o arquivo com handlers de conexão e broadcast**

Criar `backend/src/ws.ts` com o conteúdo completo:

```typescript
import { gerenciadorJogo } from './game';
import { queries } from './db/queries';
import { validarNome, validarResposta, validarIndiceDica } from './schemas/jogo.schema';

// UUID → ServerWebSocket (para broadcast e envio direcionado)
const connections = new Map<string, any>();
// WebSocket → UUID (reverse lookup em handlers)
const wsToId = new WeakMap<object, string>();

export function getActiveSocketIds(): string[] {
  return Array.from(connections.keys());
}

function broadcast(event: string, data: any) {
  const msg = JSON.stringify({ event, data });
  for (const conn of connections.values()) {
    try { conn.send(msg); } catch {}
  }
}

function sendTo(socketId: string, event: string, data: any) {
  try {
    connections.get(socketId)?.send(JSON.stringify({ event, data }));
  } catch {}
}

function broadcastExcept(socketId: string, event: string, data: any) {
  const msg = JSON.stringify({ event, data });
  for (const [id, conn] of connections.entries()) {
    if (id !== socketId) try { conn.send(msg); } catch {}
  }
}

function getIndiceJogadorTurno(): number {
  const jogadores = gerenciadorJogo.getJogadores(getActiveSocketIds());
  return jogadores.findIndex(j => j.e_turno_atual);
}

function getIdJogadorTurno(): string {
  return gerenciadorJogo.getIdJogadorAtual();
}

function mapJogadorParaFrontend(jogador: any) {
  return {
    id: jogador.id_socket,
    name: jogador.nome_jogador,
    diceRoll: jogador.rolagem_dado,
    score: jogador.pontuacao,
    isHost: jogador.e_host,
  };
}

// ── Handlers ─────────────────────────────────────────────

function handleJoinLobby(ws: any, socketId: string, data: any) {
  try {
    const nome = data?.nome;
    const sessionId = data?.sessionId ?? '';
    const nomeValidado = validarNome(nome);
    if (!nomeValidado) {
      sendTo(socketId, 'error', { message: 'Nome deve ter entre 1 e 20 caracteres' });
      return;
    }
    const sessao = gerenciadorJogo.buscarSessaoAtiva();
    if (!sessao) gerenciadorJogo.criarSessao(nomeValidado);
    const jogador = gerenciadorJogo.reativarOuAdicionarJogador(socketId, sessionId, nomeValidado);
    if (!jogador) {
      sendTo(socketId, 'lobby-full', {});
      return;
    }
    sendTo(socketId, 'joined-lobby', {
      player: mapJogadorParaFrontend(jogador),
      players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
    });
    broadcastExcept(socketId, 'player-joined',
      gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend));
  } catch (e: any) {
    console.error('Erro em join-lobby:', e.message);
    sendTo(socketId, 'error', { message: e.message });
  }
}

function handleRequestGameState(ws: any, socketId: string) {
  try {
    if (gerenciadorJogo.getJogoEncerrado()) {
      sendTo(socketId, 'victory-state', {
        ranking: gerenciadorJogo.obterRankingFinal().map((j: any) => ({
          id: j.id_socket,
          name: j.nome_jogador,
          score: j.pontuacao,
        })),
      });
      return;
    }
    if (gerenciadorJogo.getJogoIniciado()) {
      sendTo(socketId, 'game-started', {
        currentCard: gerenciadorJogo.getCartaAtual(),
        currentPlayerIndex: getIndiceJogadorTurno(),
        currentPlayerId: getIdJogadorTurno(),
        players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
      });
      sendTo(socketId, 'clue-revealed', {
        revealedClueIndices: gerenciadorJogo.getDicasReveladas(),
        currentPlayerIndex: getIndiceJogadorTurno(),
        currentPlayerId: getIdJogadorTurno(),
      });
      return;
    }
    const jogadores = gerenciadorJogo.getJogadores(getActiveSocketIds());
    if (jogadores.length > 0) {
      sendTo(socketId, 'lobby-state', { players: jogadores.map(mapJogadorParaFrontend) });
    }
  } catch (e: any) {
    console.error('Erro em request-game-state:', e.message);
  }
}

function handleRollDice(ws: any, socketId: string) {
  try {
    const diceRoll = Math.floor(Math.random() * 100) + 1;
    const sucesso = gerenciadorJogo.atualizarRolagemDado(socketId, diceRoll);
    if (sucesso) {
      broadcast('dice-rolled', {
        playerId: socketId,
        playerName: gerenciadorJogo.getJogadorPorSocket(socketId)?.nome_jogador,
        diceRoll,
      });
    }
  } catch (e: any) {
    console.error('Erro em roll-dice:', e.message);
  }
}

function handleSetPlayOrder(ws: any, socketId: string) {
  try {
    const jogador = gerenciadorJogo.getJogadorPorSocket(socketId);
    if (!jogador?.e_host) return;
    gerenciadorJogo.ordenarJogadores();
    broadcast('play-order-set',
      gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend));
  } catch (e: any) {
    console.error('Erro em set-play-order:', e.message);
  }
}

function handleSelectTheme(ws: any, socketId: string, data: any) {
  try {
    const jogador = gerenciadorJogo.getJogadorPorSocket(socketId);
    if (!jogador?.e_host) return;
    const temaId = typeof data === 'number' ? data : data?.temaId;
    if (!temaId) return;
    gerenciadorJogo.definirTema(temaId);
    const tema = queries.buscarTemaPorId(temaId);
    const disciplina = tema ? queries.buscarDisciplinaPorId(tema.disciplina_id) : null;
    broadcast('theme-selected', {
      temaId,
      temaNome: tema?.nome ?? '',
      disciplinaId: tema?.disciplina_id ?? 0,
      disciplinaNome: disciplina?.nome ?? '',
    });
  } catch (e: any) {
    console.error('Erro em select-theme:', e.message);
  }
}

function handleStartGame(ws: any, socketId: string) {
  try {
    const jogador = gerenciadorJogo.getJogadorPorSocket(socketId);
    if (!jogador?.e_host) return;
    gerenciadorJogo.iniciarJogo();
    broadcast('game-started', {
      currentCard: gerenciadorJogo.getCartaAtual(),
      currentPlayerIndex: getIndiceJogadorTurno(),
      currentPlayerId: getIdJogadorTurno(),
      players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
    });
  } catch (e: any) {
    console.error('Erro em start-game:', e.message);
  }
}

function handleRevealClue(ws: any, socketId: string, data: any) {
  try {
    const indiceDica = typeof data === 'number' ? data : data?.indiceDica;
    const indiceValido = validarIndiceDica(indiceDica);
    if (indiceValido === null) {
      sendTo(socketId, 'error', { message: 'Índice de dica deve ser entre 0 e 9' });
      return;
    }
    const sucesso = gerenciadorJogo.revelarDica(socketId, indiceValido);
    if (sucesso) {
      broadcast('clue-revealed', {
        revealedClueIndices: gerenciadorJogo.getDicasReveladas(),
        currentPlayerIndex: getIndiceJogadorTurno(),
        currentPlayerId: getIdJogadorTurno(),
        players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
      });
    }
  } catch (e: any) {
    console.error('Erro em reveal-clue:', e.message);
    sendTo(socketId, 'error', { message: e.message });
  }
}

function handlePassTurn(ws: any, socketId: string) {
  try {
    const sucesso = gerenciadorJogo.passarVez(socketId);
    if (sucesso) {
      broadcast('clue-revealed', {
        revealedClueIndices: gerenciadorJogo.getDicasReveladas(),
        currentPlayerIndex: getIndiceJogadorTurno(),
        currentPlayerId: getIdJogadorTurno(),
      });
    }
  } catch (e: any) {
    console.error('Erro em pass-turn:', e.message);
  }
}

function handleSubmitAnswer(ws: any, socketId: string, data: any) {
  try {
    const resposta = typeof data === 'string' ? data : data?.resposta;
    const respostaValidada = validarResposta(resposta);
    if (!respostaValidada) {
      sendTo(socketId, 'error', { message: 'Resposta deve ter entre 1 e 100 caracteres' });
      return;
    }
    const resp = gerenciadorJogo.adicionarResposta(socketId, respostaValidada);
    if (resp) {
      const host = gerenciadorJogo.getJogadores(getActiveSocketIds()).find((j: any) => j.e_host);
      if (host) {
        sendTo(host.id_socket, 'new-answer', {
          id: resp.id,
          playerId: socketId,
          playerName: resp.nome_jogador,
          answer: resp.resposta,
          timestamp: Date.now(),
        });
      }
    }
  } catch (e: any) {
    console.error('Erro em submit-answer:', e.message);
    sendTo(socketId, 'error', { message: e.message });
  }
}

function handleValidateAnswer(ws: any, socketId: string, data: any) {
  try {
    if (!data || typeof data !== 'object') {
      sendTo(socketId, 'error', { message: 'Dados inválidos' });
      return;
    }
    const { answerId, isCorrect } = data;
    if (typeof answerId !== 'number' || answerId < 1) {
      sendTo(socketId, 'error', { message: 'ID de resposta inválido' });
      return;
    }
    if (typeof isCorrect !== 'boolean') {
      sendTo(socketId, 'error', { message: 'isCorrect deve ser booleano' });
      return;
    }
    const casasValidas = gerenciadorJogo.calcularPontos();
    const resultado = gerenciadorJogo.validarResposta(answerId, isCorrect, casasValidas);
    if (resultado.sucesso) {
      if (isCorrect && resultado.nomeJogador) {
        broadcast('answer-correct', {
          playerName: resultado.nomeJogador,
          correctAnswer: resultado.respostaCorreta,
          pointsAwarded: casasValidas,
          currentPlayerId: getIdJogadorTurno(),
          players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
        });
        setTimeout(() => {
          const nextCard = gerenciadorJogo.getCartaAtual();
          if (!nextCard) {
            broadcast('victory-state', {
              ranking: gerenciadorJogo.obterRankingFinal().map((j: any) => ({
                id: j.id_socket,
                name: j.nome_jogador,
                score: j.pontuacao,
              })),
            });
          } else if (gerenciadorJogo.getJogoIniciado()) {
            broadcast('next-card', {
              currentCard: nextCard,
              currentPlayerIndex: getIndiceJogadorTurno(),
              currentPlayerId: getIdJogadorTurno(),
              players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
            });
          }
        }, 3000);
      } else {
        broadcast('answer-incorrect', {
          playerName: resultado.nomeJogador,
          answer: resultado.resposta,
          nextPlayerIndex: getIndiceJogadorTurno(),
          nextPlayerId: getIdJogadorTurno(),
          players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
        });
      }
      const respostasAtuais = gerenciadorJogo.getRespostas();
      broadcast('answers-updated', respostasAtuais.map((r: any) => ({
        id: r.id,
        playerId: '',
        playerName: r.nome_jogador,
        answer: r.resposta,
        timestamp: new Date(r.data_envio).getTime(),
      })));
    }
  } catch (e: any) {
    console.error('Erro em validate-answer:', e.message);
    sendTo(socketId, 'error', { message: e.message });
  }
}

function handleRevealAnswer(ws: any, socketId: string) {
  try {
    const respostaCorreta = gerenciadorJogo.revelarResposta();
    if (respostaCorreta) {
      broadcast('answer-revealed', { correctAnswer: respostaCorreta });
      setTimeout(() => {
        const nextCard = gerenciadorJogo.getCartaAtual();
        if (!nextCard) {
          broadcast('victory-state', {
            ranking: gerenciadorJogo.obterRankingFinal().map((j: any) => ({
              id: j.id_socket,
              name: j.nome_jogador,
              score: j.pontuacao,
            })),
          });
        } else if (gerenciadorJogo.getJogoIniciado()) {
          broadcast('next-card', {
            currentCard: nextCard,
            currentPlayerIndex: getIndiceJogadorTurno(),
            currentPlayerId: getIdJogadorTurno(),
          });
        }
      }, 3000);
    }
  } catch (e: any) {
    console.error('Erro em reveal-answer:', e.message);
  }
}

function handleRestartGame(ws: any, socketId: string) {
  try {
    const jogador = gerenciadorJogo.getJogadorPorSocket(socketId);
    if (!jogador?.e_host) return;
    gerenciadorJogo.reiniciarJogo();
    broadcast('game-restarted',
      gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend));
  } catch (e: any) {
    console.error('Erro em restart-game:', e.message);
  }
}

function handleExitVictoryScreen(ws: any, socketId: string) {
  try {
    const jogador = gerenciadorJogo.getJogadorPorSocket(socketId);
    if (!jogador?.e_host) return;
    gerenciadorJogo.sairDaTelaDeVitoria();
    broadcast('return-to-lobby',
      gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend));
  } catch (e: any) {
    console.error('Erro em exit-victory-screen:', e.message);
  }
}

function handleSairLobby(ws: any, socketId: string) {
  try {
    gerenciadorJogo.removerJogador(socketId, true);
    broadcast('player-left', {
      playerId: socketId,
      players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
    });
  } catch (e: any) {
    console.error('Erro em sair-lobby:', e.message);
  }
}

// ── Exported WS lifecycle hooks ───────────────────────────

export const wsHandlers = {
  open(ws: any) {
    const id = crypto.randomUUID();
    wsToId.set(ws, id);
    connections.set(id, ws);
    ws.send(JSON.stringify({ event: 'session-id', data: { id } }));
    console.log('🔌 WS conectado:', id);
  },

  message(ws: any, raw: string | Uint8Array) {
    const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
    let parsed: { event: string; data?: any };
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    const socketId = wsToId.get(ws);
    if (!socketId) return;
    const { event, data } = parsed;
    switch (event) {
      case 'join-lobby':           handleJoinLobby(ws, socketId, data); break;
      case 'request-game-state':   handleRequestGameState(ws, socketId); break;
      case 'roll-dice':            handleRollDice(ws, socketId); break;
      case 'set-play-order':       handleSetPlayOrder(ws, socketId); break;
      case 'select-theme':         handleSelectTheme(ws, socketId, data); break;
      case 'start-game':           handleStartGame(ws, socketId); break;
      case 'reveal-clue':          handleRevealClue(ws, socketId, data); break;
      case 'pass-turn':            handlePassTurn(ws, socketId); break;
      case 'submit-answer':        handleSubmitAnswer(ws, socketId, data); break;
      case 'validate-answer':      handleValidateAnswer(ws, socketId, data); break;
      case 'reveal-answer':        handleRevealAnswer(ws, socketId); break;
      case 'restart-game':         handleRestartGame(ws, socketId); break;
      case 'exit-victory-screen':  handleExitVictoryScreen(ws, socketId); break;
      case 'sair-lobby':           handleSairLobby(ws, socketId); break;
    }
  },

  close(ws: any) {
    const socketId = wsToId.get(ws);
    if (!socketId) return;
    connections.delete(socketId);
    wsToId.delete(ws);
    gerenciadorJogo.removerJogador(socketId, false);
    broadcast('player-left', {
      playerId: socketId,
      players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
    });
    console.log('🔌 WS desconectado:', socketId);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/ws.ts
git commit -m "feat(backend): add Elysia WS handler (ws.ts)"
```

---

### Task 4: Atualizar `backend/src/game.ts`

**Files:**
- Modify: `backend/src/game.ts:3` (remover import de getIO)
- Modify: `backend/src/game.ts:448-457` (remover io.emit de encerrarJogo)

O `game.ts` importa `getIO` de `socket.ts` e emite `game-ended` dentro de `encerrarJogo()`. Como `ws.ts` já emite `victory-state` via `handleValidateAnswer`/`handleRevealAnswer` após detectar que não há próxima carta, o `game-ended` de dentro de `game.ts` é redundante e pode ser removido.

- [ ] **Step 1: Remover import de getIO**

Em `backend/src/game.ts`, remover a linha:
```typescript
import { getIO } from './socket';
```

- [ ] **Step 2: Remover o bloco io.emit de encerrarJogo**

Localizar em `backend/src/game.ts` o bloco (aproximadamente linhas 448-457):
```typescript
    const io = getIO();
    if (io) {
      io.emit('game-ended', {
        ranking: ranking.map(j => ({
          id: j.id_socket,
          name: j.nome_jogador,
          score: j.pontuacao,
        }))
      });
    }
```

Remover esse bloco inteiro. O método `encerrarJogo` deve continuar atualizando estado e DB normalmente — só o `io.emit` sai.

- [ ] **Step 3: Verificar que o arquivo compila**

```bash
cd backend && bun run src/game.ts 2>&1 | head -20
```

Resultado esperado: sem erros de importação ou TypeScript.

- [ ] **Step 4: Commit**

```bash
git add backend/src/game.ts
git commit -m "refactor(backend): remove getIO dependency from game.ts"
```

---

### Task 5: Reescrever `backend/src/index.ts`

**Files:**
- Modify: `backend/src/index.ts` (reescrever com Elysia)
- Delete: `backend/src/socket.ts` (após index.ts migrado)

- [ ] **Step 1: Reescrever index.ts com Elysia**

Substituir todo o conteúdo de `backend/src/index.ts`:

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ws } from '@elysiajs/ws';
import { wsHandlers } from './ws';
import { gerenciadorJogo } from './game';
import { queries } from './db/queries';
import { seedInitialData } from './db/seed';
import './db';

const PORT = 3001;

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  gerenciadorJogo.limparTudo();
  process.exit(0);
});

seedInitialData();

const app = new Elysia()
  .use(cors())
  .use(ws())

  // ── Status ──────────────────────────────────────────────
  .get('/', () => ({ message: 'API Jogo Perfil', version: '1.0.0' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .get('/game-state', () => {
    const sessao = gerenciadorJogo.buscarSessaoAtiva();
    if (!sessao) return { active: false };
    return {
      active: true,
      sessionId: sessao.id,
      host: sessao.nome_host,
      players: gerenciadorJogo.getJogadores().map((j: any) => ({
        name: j.nome_jogador,
        score: j.pontuacao,
        isHost: j.e_host,
      })),
      gameStarted: gerenciadorJogo.getJogoIniciado(),
      currentCard: gerenciadorJogo.getCartaAtual()?.nome,
    };
  })

  // ── Disciplinas ──────────────────────────────────────────
  .get('/api/disciplinas', () => queries.listarDisciplinas())
  .get('/api/disciplinas/:id', ({ params }) =>
    queries.buscarDisciplinaPorId(Number(params.id)) ?? { error: 'Disciplina não encontrada' })
  .post('/api/disciplinas', ({ body, set }: { body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    const id = queries.criarDisciplina(body.nome.trim());
    return { id, nome: body.nome };
  })
  .put('/api/disciplinas/:id', ({ params, body, set }: { params: any; body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    queries.atualizarDisciplina(Number(params.id), body.nome.trim());
    return { success: true };
  })
  .delete('/api/disciplinas/:id', ({ params }) => {
    queries.excluirDisciplina(Number(params.id));
    return { success: true };
  })

  // ── Temas ────────────────────────────────────────────────
  .get('/api/temas', () => queries.listarTemas())
  .get('/api/temas/:id', ({ params }) =>
    queries.buscarTemaPorId(Number(params.id)) ?? { error: 'Tema não encontrado' })
  .post('/api/temas', ({ body, set }: { body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    if (!body?.disciplinaId) { set.status = 400; return { error: 'Disciplina é obrigatória' }; }
    const id = queries.criarTema(body.nome.trim(), body.disciplinaId);
    return { id, nome: body.nome, disciplinaId: body.disciplinaId };
  })
  .put('/api/temas/:id', ({ params, body, set }: { params: any; body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    if (!body?.disciplinaId) { set.status = 400; return { error: 'Disciplina é obrigatória' }; }
    queries.atualizarTema(Number(params.id), body.nome.trim(), body.disciplinaId);
    return { success: true };
  })
  .delete('/api/temas/:id', ({ params }) => {
    queries.excluirTema(Number(params.id));
    return { success: true };
  })

  // ── Cartas ───────────────────────────────────────────────
  .get('/api/cartas', () => queries.buscarTodasCartas())
  .get('/api/cartas/tema/:id', ({ params }) => queries.buscarCartasPorTema(Number(params.id)))
  .get('/api/cartas/disciplina/:id', ({ params }) => queries.buscarCartasPorDisciplina(Number(params.id)))
  .get('/api/cartas/:id', ({ params }) => {
    const carta = queries.buscarCartaPorId(Number(params.id));
    if (!carta) return { error: 'Carta não encontrada' };
    return { ...carta, dicas: JSON.parse(carta.dicas) };
  })
  .post('/api/cartas', ({ body, set }: { body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    if (!body?.temaId) { set.status = 400; return { error: 'Tema é obrigatório' }; }
    if (!Array.isArray(body?.dicas) || body.dicas.length !== 10) {
      set.status = 400; return { error: 'Carta deve ter exatamente 10 dicas' };
    }
    for (let i = 0; i < body.dicas.length; i++) {
      if (!body.dicas[i]?.trim()) { set.status = 400; return { error: `Dica ${i + 1} é obrigatória` }; }
    }
    const id = queries.criarCarta(body.nome.trim(), body.temaId, body.dicas.map((d: string) => d.trim()));
    return { id, nome: body.nome, temaId: body.temaId, dicas: body.dicas };
  })
  .put('/api/cartas/:id', ({ params, body, set }: { params: any; body: any; set: any }) => {
    if (!body?.nome?.trim()) { set.status = 400; return { error: 'Nome é obrigatório' }; }
    if (!body?.temaId) { set.status = 400; return { error: 'Tema é obrigatório' }; }
    if (!Array.isArray(body?.dicas) || body.dicas.length !== 10) {
      set.status = 400; return { error: 'Carta deve ter exatamente 10 dicas' };
    }
    queries.atualizarCarta(Number(params.id), body.nome.trim(), body.temaId, body.dicas.map((d: string) => d.trim()));
    return { success: true };
  })
  .delete('/api/cartas/:id', ({ params }) => {
    queries.excluirCarta(Number(params.id));
    return { success: true };
  })

  // ── WebSocket ────────────────────────────────────────────
  .ws('/ws', {
    open: wsHandlers.open,
    message: wsHandlers.message,
    close: wsHandlers.close,
  })

  .listen({ port: PORT, hostname: '0.0.0.0' });

console.log(`🦊 Servidor Elysia rodando em http://0.0.0.0:${PORT}`);
console.log(`🔌 WebSocket disponível em ws://0.0.0.0:${PORT}/ws`);
console.log('✅ Banco de dados inicializado');
```

- [ ] **Step 2: Deletar `backend/src/socket.ts`**

```bash
rm backend/src/socket.ts
```

- [ ] **Step 3: Iniciar o backend e verificar que sobe sem erros**

```bash
cd backend && bun run dev
```

Resultado esperado: logs aparecem sem exceções:
```
🦊 Servidor Elysia rodando em http://0.0.0.0:3001
🔌 WebSocket disponível em ws://0.0.0.0:3001/ws
✅ Banco de dados inicializado
```

- [ ] **Step 4: Testar a API REST**

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/disciplinas
```

Resultado esperado: JSON válido em ambos.

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts
git rm backend/src/socket.ts
git commit -m "feat(backend): migrate to Elysia app with native WS endpoint"
```

---

### Task 6: Reescrever `frontend/lib/socket.ts`

**Files:**
- Modify: `frontend/lib/socket.ts` (reescrever com WsClient nativo)

O `WsClient` replica a API do Socket.IO (`.on/.emit/.off/.disconnect`) com WebSocket nativo. O servidor envia `{ event: 'session-id', data: { id } }` imediatamente ao conectar — o cliente armazena esse `id` e só então dispara o evento `'connect'`, garantindo que `socket.id` esteja disponível nos handlers das páginas.

- [ ] **Step 1: Reescrever frontend/lib/socket.ts**

```typescript
type Handler = (data: any) => void;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'perfil_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectAttempts = 0;
  private readonly maxReconnect = 5;
  private readonly baseUrl: string;
  id: string = '';
  connected: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;
    const sessionId = getOrCreateSessionId();
    this.ws = new WebSocket(`${this.baseUrl}?sessionId=${sessionId}`);

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const { event, data } = JSON.parse(e.data as string);
        if (event === 'session-id') {
          this.id = data.id;
          this.connected = true;
          this.reconnectAttempts = 0;
          this.fire('connect', undefined);
          return;
        }
        this.fire(event, data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.fire('disconnect', 'transport close');
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = () => {
      this.fire('connect_error', new Error('WebSocket connection error'));
    };
  }

  private fire(event: string, data: any) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler?: Handler): void {
    if (!handler) { this.handlers.delete(event); return; }
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data?: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnect;
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}

export type { WsClient };

let client: WsClient | null = null;

export function getSocket(): WsClient {
  if (!client) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.hostname}:3001/ws`;
    client = new WsClient(url);
  }
  return client;
}

export function disconnectSocket(): void {
  client?.disconnect();
  client = null;
}

export function getSessionId(): string {
  return getOrCreateSessionId();
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('perfil_session_id');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/socket.ts
git commit -m "feat(frontend): replace socket.io-client with native WsClient"
```

---

### Task 7: Atualizar `frontend/app/lobby/page.tsx`

**Files:**
- Modify: `frontend/app/lobby/page.tsx`

Remover import do tipo `Socket` do socket.io-client e atualizar o tipo do `socketRef`.

- [ ] **Step 1: Remover import de Socket e atualizar tipo do ref**

Localizar e remover:
```typescript
import { Socket } from 'socket.io-client';
```

Localizar e substituir:
```typescript
  const socketRef = useRef<Socket | null>(null);
```
Por:
```typescript
  const socketRef = useRef<import('@/lib/socket').WsClient | null>(null);
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
cd frontend && bun run build 2>&1 | grep -E "error|Error" | head -20
```

Resultado esperado: sem erros de tipo em `lobby/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/lobby/page.tsx
git commit -m "refactor(frontend): update lobby page to WsClient type"
```

---

### Task 8: Atualizar `frontend/app/game/page.tsx`

**Files:**
- Modify: `frontend/app/game/page.tsx`

- [ ] **Step 1: Remover import de Socket e atualizar tipo do ref**

Localizar e remover:
```typescript
import { Socket } from 'socket.io-client';
```

Localizar e substituir:
```typescript
  const socketRef = useRef<Socket | null>(null);
```
Por:
```typescript
  const socketRef = useRef<import('@/lib/socket').WsClient | null>(null);
```

- [ ] **Step 2: Verificar que o TypeScript compila**

```bash
cd frontend && bun run build 2>&1 | grep -E "error|Error" | head -20
```

Resultado esperado: sem erros de tipo em `game/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/game/page.tsx
git commit -m "refactor(frontend): update game page to WsClient type"
```

---

### Task 9: Atualizar `frontend/app/victory/page.tsx`

**Files:**
- Modify: `frontend/app/victory/page.tsx`

A `victory/page.tsx` não usa o tipo `Socket` diretamente — apenas chama `getSocket()` e `.on/.emit/.off`. Verificar que não há imports de socket.io-client.

- [ ] **Step 1: Verificar e remover imports remanescentes de socket.io-client**

```bash
grep -n "socket.io-client" /home/luisthedevmagician/Perfil/frontend/app/victory/page.tsx
```

Se houver resultado, remover a linha de import. Se não houver, avançar.

- [ ] **Step 2: Build completo do frontend**

```bash
cd frontend && bun run build
```

Resultado esperado: build sem erros.

- [ ] **Step 3: Teste de integração manual**

Com backend rodando (`cd backend && bun run dev`):

1. Abrir `http://localhost:3000` — tela inicial deve carregar
2. Entrar no lobby — deve conectar e exibir o jogador
3. Um segundo player (outra aba) — deve aparecer no lobby do primeiro
4. HOST inicia a partida — ambas as abas devem ir para `/game`
5. Revelar dicas — deve sincronizar em tempo real
6. Submeter resposta — HOST deve receber no painel
7. Validar como correta — modal verde em ambas as abas, som deve tocar
8. Chegando na tela de vitória — ranking deve aparecer

- [ ] **Step 4: Commit final**

```bash
git add frontend/app/victory/page.tsx
git commit -m "refactor(frontend): verify victory page compatible with WsClient"
```

---

### Task 10: Atualizar CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Atualizar seção Backend Architecture**

Substituir referências a Socket.IO por Elysia WS:

- `src/socket.ts` → `src/ws.ts`
- Mencionar que o servidor é Elysia (não mais `http.createServer`)
- Atualizar o protocolo de mensagem WS: `{ event: string, data: any }`
- Mencionar `connections: Map<UUID, ServerWebSocket>` + `wsToId: WeakMap`

- [ ] **Step 2: Atualizar seção Frontend Architecture**

- `lib/socket.ts` agora exporta `WsClient` (WebSocket nativo) com API `.on/.emit/.off`
- Detalhar que `session-id` event dispara o `connect` e popula `socket.id`
- Remover menção a `socket.io-client`

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Elysia WS migration"
```
