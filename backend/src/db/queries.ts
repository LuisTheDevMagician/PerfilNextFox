import { sqlite } from './index';

export const queries = {
  criarSessao: (nomeHost: string): number => {
    // Fecha sessões anteriores antes de criar uma nova
    sqlite.prepare('UPDATE sessoes_jogo SET esta_ativa = 0').run();
    const stmt = sqlite.prepare('INSERT INTO sessoes_jogo (nome_host) VALUES (?)');
    const result = stmt.run(nomeHost);
    return Number(result.lastInsertRowid);
  },

  buscarSessaoAtiva: () => {
    const stmt = sqlite.prepare('SELECT * FROM sessoes_jogo WHERE esta_ativa = 1 LIMIT 1');
    return stmt.get() as any;
  },

  buscarSessaoPorId: (id: number) => {
    const stmt = sqlite.prepare('SELECT * FROM sessoes_jogo WHERE id = ?');
    return stmt.get(id) as any;
  },

  atualizarSessao: (id: number, data: {
    idCartaAtual?: number;
    dicasReveladas?: string;
    idJogadorAtual?: number;
    estaAtiva?: number;
    revelouEstaTurno?: number;
  }) => {
    const sets: string[] = [];
    const values: any[] = [];
    
    if (data.idCartaAtual !== undefined) {
      sets.push('id_carta_atual = ?');
      values.push(data.idCartaAtual);
    }
    if (data.dicasReveladas !== undefined) {
      sets.push('dicas_reveladas = ?');
      values.push(data.dicasReveladas);
    }
    if (data.idJogadorAtual !== undefined) {
      sets.push('id_jogador_atual = ?');
      values.push(data.idJogadorAtual);
    }
    if (data.estaAtiva !== undefined) {
      sets.push('esta_ativa = ?');
      values.push(data.estaAtiva);
    }
    if (data.revelouEstaTurno !== undefined) {
      sets.push('revelou_esta_turno = ?');
      values.push(data.revelouEstaTurno);
    }
    
    values.push(id);
    const stmt = sqlite.prepare(`UPDATE sessoes_jogo SET ${sets.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
  },

  encerrarSessao: (id: number) => {
    const stmt = sqlite.prepare('UPDATE sessoes_jogo SET esta_ativa = 0 WHERE id = ?');
    return stmt.run(id);
  },

  adicionarJogador: (idSessao: number, idSocket: string, sessionId: string, nomeJogador: string, eHost: number): number => {
    const stmt = sqlite.prepare(`
      INSERT INTO jogadores_sessao (id_sessao, id_socket, session_id, nome_jogador, pontuacao, rolagem_dado, e_host, e_turno_atual)
      VALUES (?, ?, ?, ?, 0, ?, ?, 0)
    `);
    const result = stmt.run(idSessao, idSocket, sessionId, nomeJogador, eHost === 1 ? 0 : null, eHost);
    return Number(result.lastInsertRowid);
  },

  buscarJogadoresSessao: (idSessao: number) => {
    const stmt = sqlite.prepare('SELECT * FROM jogadores_sessao WHERE id_sessao = ? ORDER BY e_host DESC, rolagem_dado DESC');
    return stmt.all(idSessao) as any[];
  },

  buscarJogadorPorSocket: (idSocket: string) => {
    const stmt = sqlite.prepare('SELECT * FROM jogadores_sessao WHERE id_socket = ?');
    return stmt.get(idSocket) as any;
  },

  buscarJogadorPorSessionId: (sessionId: string) => {
    const stmt = sqlite.prepare('SELECT * FROM jogadores_sessao WHERE session_id = ?');
    return stmt.get(sessionId) as any;
  },

  atualizarSocketJogador: (id: number, idSocket: string) => {
    const stmt = sqlite.prepare('UPDATE jogadores_sessao SET id_socket = ? WHERE id = ?');
    return stmt.run(idSocket, id);
  },

  atualizarJogador: (id: number, data: { pontuacao?: number, rolagemDado?: number | null, eTurnoAtual?: number, eHost?: number }) => {
    const sets = [];
    const values = [];
    
    if (data.pontuacao !== undefined) {
      sets.push('pontuacao = ?');
      values.push(data.pontuacao);
    }
    if (data.rolagemDado !== undefined) {
      sets.push('rolagem_dado = ?');
      values.push(data.rolagemDado);
    }
    if (data.eTurnoAtual !== undefined) {
      sets.push('e_turno_atual = ?');
      values.push(data.eTurnoAtual);
    }
    if (data.eHost !== undefined) {
      sets.push('e_host = ?');
      values.push(data.eHost);
    }
    
    values.push(id);
    const stmt = sqlite.prepare(`UPDATE jogadores_sessao SET ${sets.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
  },

  atualizarPontuacaoPorSocket: (idSocket: string, pontuacao: number) => {
    const stmt = sqlite.prepare('UPDATE jogadores_sessao SET pontuacao = ? WHERE id_socket = ?');
    return stmt.run(pontuacao, idSocket);
  },

  removerJogador: (idSocket: string) => {
    const stmt = sqlite.prepare('DELETE FROM jogadores_sessao WHERE id_socket = ?');
    return stmt.run(idSocket);
  },

  adicionarRespostaPendente: (idSessao: number, nomeJogador: string, resposta: string): number => {
    const stmt = sqlite.prepare('INSERT INTO respostas_pendentes (id_sessao, nome_jogador, resposta) VALUES (?, ?, ?)');
    const result = stmt.run(idSessao, nomeJogador, resposta);
    return Number(result.lastInsertRowid);
  },

  buscarRespostasSessao: (idSessao: number) => {
    const stmt = sqlite.prepare('SELECT * FROM respostas_pendentes WHERE id_sessao = ?');
    return stmt.all(idSessao) as any[];
  },

  removerResposta: (id: number) => {
    const stmt = sqlite.prepare('DELETE FROM respostas_pendentes WHERE id = ?');
    return stmt.run(id);
  },

  limparRespostasSessao: (idSessao: number) => {
    const stmt = sqlite.prepare('DELETE FROM respostas_pendentes WHERE id_sessao = ?');
    return stmt.run(idSessao);
  },

  upsertJogador: (nome: string) => {
    const stmt = sqlite.prepare('INSERT OR IGNORE INTO jogadores (nome) VALUES (?)');
    return stmt.run(nome);
  },

  atualizarPontuacaoJogador: (nome: string, pontuacao: number) => {
    const stmt = sqlite.prepare('UPDATE jogadores SET pontuacao_total = pontuacao_total + ? WHERE nome = ?');
    return stmt.run(pontuacao, nome);
  },

  adicionarVitoria: (nome: string) => {
    const stmt = sqlite.prepare('UPDATE jogadores SET total_vitorias = total_vitorias + 1 WHERE nome = ?');
    return stmt.run(nome);
  },

  adicionarHistoricoPartida: (nomeVencedor: string | null, pontuacaoVencedor: number | null, totalJogadores: number) => {
    const stmt = sqlite.prepare('INSERT INTO historico_partidas (nome_vencedor, pontuacao_vencedor, total_jogadores) VALUES (?, ?, ?)');
    return stmt.run(nomeVencedor, pontuacaoVencedor, totalJogadores);
  },

  buscarRanking: () => {
    const stmt = sqlite.prepare('SELECT nome, pontuacao_total, total_vitorias FROM jogadores ORDER BY pontuacao_total DESC LIMIT 10');
    return stmt.all() as any[];
  },

  limparSessao: (manterJogadores: boolean = false) => {
    sqlite.prepare('DELETE FROM respostas_pendentes').run();
    if (!manterJogadores) {
      sqlite.prepare('DELETE FROM jogadores_sessao').run();
    }
    sqlite.prepare('UPDATE sessoes_jogo SET esta_ativa = 0').run();
    console.log('🧹 Sessão limpiada do banco de dados');
  },

  criarDisciplina: (nome: string): number => {
    const stmt = sqlite.prepare('INSERT INTO disciplinas (nome) VALUES (?)');
    const result = stmt.run(nome);
    return Number(result.lastInsertRowid);
  },

  listarDisciplinas: () => {
    const stmt = sqlite.prepare('SELECT * FROM disciplinas ORDER BY nome');
    return stmt.all() as any[];
  },

  buscarDisciplinaPorId: (id: number) => {
    const stmt = sqlite.prepare('SELECT * FROM disciplinas WHERE id = ?');
    return stmt.get(id) as any;
  },

  atualizarDisciplina: (id: number, nome: string) => {
    const stmt = sqlite.prepare('UPDATE disciplinas SET nome = ? WHERE id = ?');
    return stmt.run(nome, id);
  },

  excluirDisciplina: (id: number) => {
    const temas = sqlite.prepare('SELECT id FROM temas WHERE disciplina_id = ?').all(id) as any[];
    for (const tema of temas) {
      sqlite.prepare('DELETE FROM cartas WHERE tema_id = ?').run(tema.id);
    }
    sqlite.prepare('DELETE FROM temas WHERE disciplina_id = ?').run(id);
    sqlite.prepare('DELETE FROM disciplinas WHERE id = ?').run(id);
  },

  criarTema: (nome: string, disciplinaId: number): number => {
    const stmt = sqlite.prepare('INSERT INTO temas (nome, disciplina_id) VALUES (?, ?)');
    const result = stmt.run(nome, disciplinaId);
    return Number(result.lastInsertRowid);
  },

  listarTemas: () => {
    const stmt = sqlite.prepare(`
      SELECT t.*, d.nome as disciplina_nome 
      FROM temas t 
      LEFT JOIN disciplinas d ON t.disciplina_id = d.id 
      ORDER BY d.nome, t.nome
    `);
    return stmt.all() as any[];
  },

  buscarTemaPorId: (id: number) => {
    const stmt = sqlite.prepare('SELECT * FROM temas WHERE id = ?');
    return stmt.get(id) as any;
  },

  atualizarTema: (id: number, nome: string, disciplinaId: number) => {
    const stmt = sqlite.prepare('UPDATE temas SET nome = ?, disciplina_id = ? WHERE id = ?');
    return stmt.run(nome, disciplinaId, id);
  },

  excluirTema: (id: number) => {
    sqlite.prepare('DELETE FROM cartas WHERE tema_id = ?').run(id);
    sqlite.prepare('DELETE FROM temas WHERE id = ?').run(id);
  },

  criarCarta: (nome: string, temaId: number, dicas: string[]): number => {
    if (dicas.length !== 10) {
      throw new Error('Carta deve ter exatamente 10 dicas');
    }
    const stmt = sqlite.prepare('INSERT INTO cartas (nome, tema_id, dicas) VALUES (?, ?, ?)');
    const result = stmt.run(nome, temaId, JSON.stringify(dicas));
    return Number(result.lastInsertRowid);
  },

  listarCartas: () => {
    const stmt = sqlite.prepare(`
      SELECT c.*, t.nome as tema_nome, d.nome as disciplina_nome, d.id as disciplina_id
      FROM cartas c
      LEFT JOIN temas t ON c.tema_id = t.id
      LEFT JOIN disciplinas d ON t.disciplina_id = d.id
      ORDER BY d.nome, t.nome, c.nome
    `);
    return stmt.all() as any[];
  },

  buscarCartaPorId: (id: number) => {
    const stmt = sqlite.prepare('SELECT * FROM cartas WHERE id = ?');
    return stmt.get(id) as any;
  },

  buscarCartasPorTema: (temaId: number) => {
    const stmt = sqlite.prepare('SELECT * FROM cartas WHERE tema_id = ?');
    return stmt.all(temaId) as any[];
  },

  buscarCartasPorDisciplina: (disciplinaId: number) => {
    const stmt = sqlite.prepare(`
      SELECT c.* FROM cartas c
      JOIN temas t ON c.tema_id = t.id
      WHERE t.disciplina_id = ?
    `);
    return stmt.all(disciplinaId) as any[];
  },

  buscarTodasCartas: () => {
    const stmt = sqlite.prepare(`
      SELECT c.*, t.nome as tema_nome, d.nome as disciplina_nome, d.id as disciplina_id
      FROM cartas c
      LEFT JOIN temas t ON c.tema_id = t.id
      LEFT JOIN disciplinas d ON t.disciplina_id = d.id
    `);
    return stmt.all() as any[];
  },

  atualizarCarta: (id: number, nome: string, temaId: number, dicas: string[]) => {
    if (dicas.length !== 10) {
      throw new Error('Carta deve ter exatamente 10 dicas');
    }
    const stmt = sqlite.prepare('UPDATE cartas SET nome = ?, tema_id = ?, dicas = ? WHERE id = ?');
    return stmt.run(nome, temaId, JSON.stringify(dicas), id);
  },

  excluirCarta: (id: number) => {
    const stmt = sqlite.prepare('DELETE FROM cartas WHERE id = ?');
    return stmt.run(id);
  },

  atualizarSessaoTema: (id: number, temaId: number) => {
    const stmt = sqlite.prepare('UPDATE sessoes_jogo SET tema_id = ? WHERE id = ?');
    return stmt.run(temaId, id);
  },
};
