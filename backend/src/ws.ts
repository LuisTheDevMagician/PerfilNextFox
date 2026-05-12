import { gerenciadorJogo } from './game';
import { queries } from './db/queries';
import { validarNome, validarResposta, validarIndiceDica } from './schemas/jogo.schema';

// socketId (ws.id do Elysia) → ServerWebSocket bruto do Bun
const connections = new Map<string, any>();

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
  return jogadores.findIndex((j: any) => j.e_turno_atual);
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

function handleJoinLobby(socketId: string, data: any) {
  try {
    const nome = data?.nome;
    const sessionId = data?.sessionId ?? '';
    const nomeValidado = validarNome(nome);
    if (!nomeValidado) {
      sendTo(socketId, 'error', { message: 'Nome deve ter entre 1 e 20 caracteres' });
      return;
    }
    const sessao = gerenciadorJogo.buscarSessaoAtiva();
    const playersAtivos = gerenciadorJogo.getJogadores(getActiveSocketIds());
    // Cria sessão nova se não há sessão ou se não há nenhum player ativo conectado
    if (!sessao || playersAtivos.length === 0) {
      gerenciadorJogo.criarSessao(nomeValidado);
    }
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

function handleRequestGameState(socketId: string) {
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

function handleRollDice(socketId: string) {
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

function handleSetPlayOrder(socketId: string) {
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

function handleSelectTheme(socketId: string, data: any) {
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

function handleStartGame(socketId: string) {
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

function handleRevealClue(socketId: string, data: any) {
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

function handlePassTurn(socketId: string) {
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

function handleSubmitAnswer(socketId: string, data: any) {
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

function handleValidateAnswer(socketId: string, data: any) {
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

function handleRevealAnswer(socketId: string) {
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

function handleRestartGame(socketId: string) {
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

function handleExitVictoryScreen(socketId: string) {
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

function handleSairLobby(socketId: string) {
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

export const wsHandlers = {
  open(ws: any) {
    // ws.id é o ID estável do Elysia para esta conexão
    // ws.raw é o ServerWebSocket nativo do Bun (mesma referência entre handlers)
    const id = ws.id as string;
    connections.set(id, ws.raw);
    ws.raw.send(JSON.stringify({ event: 'session-id', data: { id } }));
    console.log('🔌 WS conectado:', id);
  },

  message(ws: any, raw: any) {
    // Elysia faz parse automático do JSON antes de chamar este handler,
    // então raw já pode ser um objeto; tratamos ambos os casos.
    let parsed: { event: string; data?: any };
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch { return; }
    } else if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
      parsed = raw;
    } else {
      return;
    }

    const socketId = ws.id as string;
    const { event, data } = parsed;
    switch (event) {
      case 'join-lobby':           handleJoinLobby(socketId, data); break;
      case 'request-game-state':   handleRequestGameState(socketId); break;
      case 'roll-dice':            handleRollDice(socketId); break;
      case 'set-play-order':       handleSetPlayOrder(socketId); break;
      case 'select-theme':         handleSelectTheme(socketId, data); break;
      case 'start-game':           handleStartGame(socketId); break;
      case 'reveal-clue':          handleRevealClue(socketId, data); break;
      case 'pass-turn':            handlePassTurn(socketId); break;
      case 'submit-answer':        handleSubmitAnswer(socketId, data); break;
      case 'validate-answer':      handleValidateAnswer(socketId, data); break;
      case 'reveal-answer':        handleRevealAnswer(socketId); break;
      case 'restart-game':         handleRestartGame(socketId); break;
      case 'exit-victory-screen':  handleExitVictoryScreen(socketId); break;
      case 'sair-lobby':           handleSairLobby(socketId); break;
    }
  },

  close(ws: any) {
    const socketId = ws.id as string;
    connections.delete(socketId);
    gerenciadorJogo.removerJogador(socketId, false);
    broadcast('player-left', {
      playerId: socketId,
      players: gerenciadorJogo.getJogadores(getActiveSocketIds()).map(mapJogadorParaFrontend),
    });
    console.log('🔌 WS desconectado:', socketId);
  },
};
