import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
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
