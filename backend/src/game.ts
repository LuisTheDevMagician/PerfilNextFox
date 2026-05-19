import { queries } from './db/queries';
import { gameCards, type Carta, type Jogador, type RespostaPendente, type SessaoJogo } from './models';

function mapDbToJogador(row: any): Jogador {
  return {
    id: row.id,
    id_sessao: row.idSessao ?? row.id_sessao ?? 0,
    id_socket: row.idSocket ?? row.id_socket ?? '',
    session_id: row.sessionId ?? row.session_id ?? '',
    nome_jogador: row.nomeJogador ?? row.nome_jogador ?? '',
    pontuacao: row.pontuacao ?? 0,
    rolagem_dado: row.rolagemDado ?? row.rolagem_dado ?? null,
    e_host: row.eHost === 1 || row.e_host === 1,
    e_turno_atual: row.eTurnoAtual === 1 || row.e_turno_atual === 1,
  };
}

function mapDbToResposta(row: any): RespostaPendente {
  return {
    id: row.id,
    id_sessao: row.idSessao ?? row.id_sessao ?? 0,
    nome_jogador: row.nomeJogador ?? row.nome_jogador ?? '',
    resposta: row.resposta ?? '',
    data_envio: row.dataEnvio ?? row.data_envio ?? new Date().toISOString(),
  };
}

function mapDbToSessao(row: any): SessaoJogo {
  return {
    id: row.id ?? 0,
    nome_host: row.nomeHost ?? row.nome_host ?? '',
    tema_id: row.temaId ?? row.tema_id ?? null,
    id_carta_atual: row.idCartaAtual ?? row.id_carta_atual ?? 0,
    dicas_reveladas: row.dicasReveladas ?? row.dicas_reveladas ?? '[]',
    id_jogador_atual: row.idJogadorAtual ?? row.id_jogador_atual ?? 0,
    esta_ativa: row.estaAtiva === 1 || row.esta_ativa === 1,
    revelou_esta_turno: row.revelouEstaTurno ?? row.revelou_esta_turno ?? 0,
    data_criacao: row.dataCriacao ?? row.data_criacao ?? new Date().toISOString(),
  };
}

export class GerenciadorJogo {
  private sessaoAtual: SessaoJogo | null = null;
  private jogadoresMap: Map<string, Jogador> = new Map();
  private jogoIniciado: boolean = false;
  private jogoEncerrado: boolean = false;
  private revelouEstaTurno: boolean = false;
  private timerAutoPass: ReturnType<typeof setTimeout> | null = null;
  private onAutoPassCallback: (() => void) | null = null;
  private turnStartedAt: number = 0;

  constructor() {
    this.carregarSessaoAtiva();
  }

  private carregarSessaoAtiva() {
    try {
      const row = queries.buscarSessaoAtiva();
      if (row) {
        this.sessaoAtual = mapDbToSessao(row);
        this.revelouEstaTurno = this.sessaoAtual.revelou_esta_turno === 1;
        this.carregarJogadoresSessao(this.sessaoAtual.id);
        console.log('✅ Sessão ativa carregada do banco:', this.sessaoAtual.id, 'revelouEstaTurno:', this.revelouEstaTurno);
      }
    } catch (e) {
      console.log('Nenhuma sessão ativa encontrada');
    }
  }

  private carregarJogadoresSessao(idSessao: number) {
    const jogadores = queries.buscarJogadoresSessao(idSessao);
    const seen = new Map<number, Jogador>();
    for (const j of jogadores) {
      const jogador = mapDbToJogador(j);
      if (!seen.has(jogador.id)) {
        seen.set(jogador.id, jogador);
        this.jogadoresMap.set(jogador.id_socket, jogador);
        this.jogadoresMap.set(`id:${jogador.id}`, jogador);
      }
    }
  }

  setOnAutoPass(callback: () => void): void {
    this.onAutoPassCallback = callback;
  }

  pausarTimerVez(): void {
    this.cancelarTimerVez();
  }

  getTurnStartedAt(): number {
    return this.turnStartedAt;
  }

  private cancelarTimerVez(): void {
    if (this.timerAutoPass !== null) {
      clearTimeout(this.timerAutoPass);
      this.timerAutoPass = null;
    }
    this.turnStartedAt = 0;
  }

  private iniciarTimerVez(): void {
    this.cancelarTimerVez();
    this.turnStartedAt = Date.now();
    this.timerAutoPass = setTimeout(() => {
      const socketId = this.getIdJogadorAtual();
      if (socketId) {
        this.passarVez(socketId);
      } else {
        this.proximoJogador();
      }
      this.onAutoPassCallback?.();
    }, 32000);
  }

  criarSessao(nomeHost: string): number {
    const idSessao = queries.criarSessao(nomeHost);
    this.sessaoAtual = {
      id: idSessao,
      nome_host: nomeHost,
      tema_id: null,
      id_carta_atual: 0,
      dicas_reveladas: '[]',
      id_jogador_atual: 0,
      esta_ativa: true,
      revelou_esta_turno: 0,
      data_criacao: new Date().toISOString()
    };
    this.jogadoresMap.clear();
    this.jogoIniciado = false;
    this.jogoEncerrado = false;
    this.revelouEstaTurno = false;
    console.log('✅ Sessão criada:', idSessao);
    return idSessao;
  }

  definirTema(temaId: number) {
    if (!this.sessaoAtual) return;
    this.sessaoAtual.tema_id = temaId;
    this.sessaoAtual.id_carta_atual = 0;
    queries.atualizarSessaoTema(this.sessaoAtual.id, temaId);
    console.log('✅ Tema definido:', temaId);
  }

  getTemaAtual(): number | null {
    return this.sessaoAtual?.tema_id ?? null;
  }

  getSessaoAtual(): SessaoJogo | null {
    return this.sessaoAtual;
  }

  buscarSessaoAtiva(): SessaoJogo | null {
    if (this.sessaoAtual && this.sessaoAtual.esta_ativa) {
      return this.sessaoAtual;
    }
    return null;
  }

  getJogadores(socketIdsAtivos?: string[]): Jogador[] {
    const seen = new Map<string, Jogador>();
    for (const jogador of this.jogadoresMap.values()) {
      if (!seen.has(jogador.id_socket)) {
        seen.set(jogador.id_socket, jogador);
      }
    }
    let jogadores = Array.from(seen.values());
    if (socketIdsAtivos) {
      jogadores = jogadores.filter(j => socketIdsAtivos.includes(j.id_socket));
    }
    
    // Garantir ordem consistente (host primeiro, depois decrescente por rolagem)
    jogadores.sort((a, b) => {
      if (a.e_host) return -1;
      if (b.e_host) return 1;
      if (a.rolagem_dado === null) return 1;
      if (b.rolagem_dado === null) return -1;
      return b.rolagem_dado - a.rolagem_dado;
    });

    return jogadores;
  }

  getJogadorPorSocket(idSocket: string): Jogador | undefined {
    const jogadores = this.getJogadores();
    return jogadores.find(j => j.id_socket === idSocket);
  }

  getJogadorPorNome(nome: string): Jogador | undefined {
    const jogadores = this.getJogadores();
    return jogadores.find(j => j.nome_jogador === nome);
  }

  adicionarJogador(idSocket: string, sessionId: string, nome: string): Jogador | null {
    if (this.getJogadores().length >= 11) {
      return null;
    }
    const existing = this.getJogadorPorNome(nome);
    if (existing) {
      return null;
    }
    const eHost = this.getJogadores().length === 0;
    
    const idJogador = queries.adicionarJogador(
      this.sessaoAtual!.id,
      idSocket,
      sessionId,
      nome,
      eHost ? 1 : 0
    );

    const jogador: Jogador = {
      id: idJogador,
      id_sessao: this.sessaoAtual!.id,
      id_socket: idSocket,
      session_id: sessionId,
      nome_jogador: nome,
      pontuacao: 0,
      rolagem_dado: eHost ? 0 : null,
      e_host: eHost,
      e_turno_atual: false
    };
    this.jogadoresMap.set(idSocket, jogador);
    this.jogadoresMap.set(`id:${idJogador}`, jogador);

    queries.upsertJogador(nome);

    console.log(`✅ Jogador adicionado: ${nome} (${eHost ? 'HOST' : 'JOGADOR'})`);
    return jogador;
  }

  atualizarRolagemDado(idSocket: string, rolagem: number): boolean {
    const jogador = this.getJogadorPorSocket(idSocket);
    if (!jogador || jogador.e_host) return false;
    if (typeof rolagem !== 'number' || rolagem < 1 || rolagem > 100) return false;
    if (jogador.rolagem_dado !== null) return false;
    
    jogador.rolagem_dado = rolagem;
    queries.atualizarJogador(jogador.id, { rolagemDado: rolagem });
    console.log(`🎲 ${jogador.nome_jogador} rolou ${rolagem}`);
    return true;
  }

  ordenarJogadores() {
    const jogadores = this.getJogadores();
    const host = jogadores.find(j => j.e_host);
    const naoHosts = jogadores
      .filter(j => !j.e_host)
      .sort((a, b) => {
        if (a.rolagem_dado === null) return 1;
        if (b.rolagem_dado === null) return -1;
        return (b.rolagem_dado || 0) - (a.rolagem_dado || 0);
      });
    
    this.jogadoresMap.clear();
    if (host) {
      host.e_turno_atual = false;
      queries.atualizarJogador(host.id, { eTurnoAtual: 0 });
      this.jogadoresMap.set(host.id_socket, host);
    }
    for (const j of naoHosts) {
      j.e_turno_atual = false;
      queries.atualizarJogador(j.id, { eTurnoAtual: 0 });
      this.jogadoresMap.set(j.id_socket, j);
    }
    this.atualizarSessao();
    console.log('✅ Ordem de jogo definida');
  }

  iniciarJogo(): boolean {
    if (!this.sessaoAtual) return false;
    
    this.jogoIniciado = true;
    this.jogoEncerrado = false;
    this.revelouEstaTurno = false;
    this.sessaoAtual.id_carta_atual = 0;
    this.sessaoAtual.dicas_reveladas = '[]';
    
    const players = this.getJogadores();
    for (const p of players) {
      p.e_turno_atual = false;
      queries.atualizarJogador(p.id, { eTurnoAtual: 0 });
    }
    
    const primeiroNaoHost = players.find(j => !j.e_host);
    if (primeiroNaoHost) {
      this.sessaoAtual.id_jogador_atual = primeiroNaoHost.id;
      primeiroNaoHost.e_turno_atual = true;
      queries.atualizarJogador(primeiroNaoHost.id, { eTurnoAtual: 1 });
    }
    
    this.atualizarSessao();
    this.iniciarTimerVez();
    console.log('🎮 Jogo iniciado!');
    return true;
  }

  revelarDica(idSocket: string, indiceDica: number): boolean {
    if (indiceDica < 0 || indiceDica >= 10) return false;
    const jogador = this.jogadoresMap.get(idSocket);
    if (!jogador || jogador.e_host) return false;
    if (!jogador.e_turno_atual) return false;
    if (this.revelouEstaTurno) return false;
    
    const dicasReveladas = JSON.parse(this.sessaoAtual!.dicas_reveladas);
    if (dicasReveladas.includes(indiceDica)) return false;

    dicasReveladas.push(indiceDica);
    this.sessaoAtual!.dicas_reveladas = JSON.stringify(dicasReveladas);
    this.revelouEstaTurno = true;
    this.atualizarSessao();
    console.log(`✅ Dica ${indiceDica + 1} revelada por ${jogador.nome_jogador}`);
    return true;
  }

  passarVez(idSocket: string): boolean {
    const jogador = this.jogadoresMap.get(idSocket);
    if (!jogador || !jogador.e_turno_atual) return false;

    this.proximoJogador();
    return true;
  }

  private proximoJogador() {
    const jogadores = this.getJogadores().filter(j => !j.e_host);
    if (jogadores.length === 0) return;

    const idxAtual = jogadores.findIndex(j => j.e_turno_atual);
    let proximoIdx = idxAtual + 1;
    if (proximoIdx >= jogadores.length) {
      proximoIdx = 0;
    }

    for (const j of jogadores) {
      j.e_turno_atual = false;
      queries.atualizarJogador(j.id, { eTurnoAtual: 0 });
    }

    jogadores[proximoIdx].e_turno_atual = true;
    this.sessaoAtual!.id_jogador_atual = jogadores[proximoIdx].id;
    queries.atualizarJogador(jogadores[proximoIdx].id, { eTurnoAtual: 1 });
    this.revelouEstaTurno = false;
    this.atualizarSessao();
    this.iniciarTimerVez();
    console.log(`➡️ Vez passou para: ${jogadores[proximoIdx].nome_jogador}`);
  }

  adicionarResposta(idSocket: string, resposta: string): RespostaPendente | null {
    const jogador = this.jogadoresMap.get(idSocket);
    if (!jogador || jogador.e_host) return null;

    const jaRespondeu = this.getRespostas().some(r => r.nome_jogador === jogador.nome_jogador);
    if (jaRespondeu) return null;

    const idResposta = queries.adicionarRespostaPendente(this.sessaoAtual!.id, jogador.nome_jogador, resposta);

    const respostaPendente: RespostaPendente = {
      id: idResposta,
      id_sessao: this.sessaoAtual!.id,
      nome_jogador: jogador.nome_jogador,
      resposta: resposta,
      data_envio: new Date().toISOString()
    };

    console.log(`✉️ ${jogador.nome_jogador} respondeu: "${resposta}"`);
    return respostaPendente;
  }

  getRespostas(): RespostaPendente[] {
    if (!this.sessaoAtual) return [];
    try {
      const respostas = queries.buscarRespostasSessao(this.sessaoAtual.id);
      return respostas.map(mapDbToResposta);
    } catch {
      return [];
    }
  }

  validarResposta(idResposta: number, isCorrect: boolean, casas: number): { sucesso: boolean, nomeJogador?: string, respostaCorreta?: string, resposta?: string } {
    if (casas < 1 || casas > 10) return { sucesso: false };
    const respostas = this.getRespostas();
    const resposta = respostas.find(r => r.id === idResposta);
    if (!resposta) return { sucesso: false };

    const jogador = this.getJogadorPorNome(resposta.nome_jogador);
    if (!jogador) return { sucesso: false };

    queries.removerResposta(idResposta);

    if (isCorrect) {
      jogador.pontuacao += casas;
      queries.atualizarPontuacaoPorSocket(jogador.id_socket, jogador.pontuacao);

      const cartaAtual = this.getCartaAtual();
      console.log(`✓ ${jogador.nome_jogador} acertou! +${casas} pontos`);

      this.cancelarTimerVez();
      setTimeout(() => {
        this.proximaCarta();
      }, 3000);

      return { sucesso: true, nomeJogador: jogador.nome_jogador, respostaCorreta: cartaAtual?.nome };
    } else {
      this.revelouEstaTurno = false;
      this.proximoJogador();
      console.log(`✗ ${jogador.nome_jogador} errou`);
      return { sucesso: true, nomeJogador: jogador.nome_jogador, resposta: resposta.resposta };
    }
  }

  revelarResposta(): string | null {
    this.cancelarTimerVez();
    if (!this.sessaoAtual) return null;
    const cartaAtual = this.getCartaAtual();
    if (!cartaAtual) return null;

    console.log(`📖 Host revelou a resposta: ${cartaAtual.nome}`);

    setTimeout(() => {
      this.proximaCarta();
    }, 3000);

    return cartaAtual.nome;
  }

  private proximaCarta() {
    if (!this.sessaoAtual) return;
    
    const temaId = this.sessaoAtual.tema_id;
    let totalCartas = 0;
    
    if (temaId) {
      const cartas = queries.buscarCartasPorTema(temaId);
      totalCartas = cartas.length;
    }
    
    if (totalCartas === 0) {
      const gameCards = (require('./models') as any).gameCards;
      totalCartas = gameCards.length;
    }
    
    this.sessaoAtual.id_carta_atual++;
    this.sessaoAtual.dicas_reveladas = '[]';
    this.revelouEstaTurno = false;

    if (this.sessaoAtual.id_carta_atual >= totalCartas) {
      this.encerrarJogo();
      return;
    }

    queries.limparRespostasSessao(this.sessaoAtual.id);
    this.atualizarSessao();
    this.iniciarTimerVez();
    console.log(`🃏 Próxima carta: ${this.getCartaAtual()?.nome}`);
  }

  private encerrarJogo() {
    this.cancelarTimerVez();
    this.jogoEncerrado = true;
    this.jogoIniciado = false;

    const jogadores = this.getJogadores();
    for (const j of jogadores) {
      j.e_turno_atual = false;
      queries.atualizarJogador(j.id, { eTurnoAtual: 0 });
    }

    const ranking = jogadores
      .filter(j => !j.e_host)
      .sort((a, b) => b.pontuacao - a.pontuacao);

    const vencedor = ranking[0];
    if (vencedor) {
      queries.atualizarPontuacaoJogador(vencedor.nome_jogador, vencedor.pontuacao);
      queries.adicionarVitoria(vencedor.nome_jogador);
    }

    queries.adicionarHistoricoPartida(
      vencedor?.nome_jogador || null,
      vencedor?.pontuacao || null,
      ranking.length
    );

    if (this.sessaoAtual) {
      this.sessaoAtual.esta_ativa = false;
      this.atualizarSessao();
    }
    
    console.log('🏆 Jogo encerrado! Vencedor:', vencedor?.nome_jogador);
    return ranking;
  }

  obterRankingFinal(): any[] {
    const jogadores = this.getJogadores();
    return jogadores
      .filter(j => !j.e_host)
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }

  sairDaTelaDeVitoria(): void {
    if (!this.jogoEncerrado) return;
    
    if (this.sessaoAtual) {
      const jogadores = this.getJogadores();
      for (const j of jogadores) {
        j.pontuacao = 0;
        j.rolagem_dado = j.e_host ? 0 : null;
        j.e_turno_atual = false;
        queries.atualizarJogador(j.id, { pontuacao: 0, rolagemDado: j.e_host ? 0 : null, eTurnoAtual: 0 });
      }
      
      this.jogoEncerrado = false;
      this.jogoIniciado = false;
      this.sessaoAtual.id_carta_atual = 0;
      this.sessaoAtual.dicas_reveladas = '[]';
      this.sessaoAtual.esta_ativa = true;
      this.sessaoAtual.id_jogador_atual = 0;
      this.atualizarSessao();
    } else {
      this.jogoEncerrado = false;
      this.jogoIniciado = false;
      this.revelouEstaTurno = false;
    }
    
    // queries.limparSessao(true); // Removido para manter a sessão ativa
    console.log('👋 Saiu da tela de vitória - pontos resetados');
  }

  getJogoEncerrado(): boolean {
    return this.jogoEncerrado;
  }

  getIndiceCartaAtual(): number {
    return this.sessaoAtual?.id_carta_atual ?? 0;
  }

  getTotalCartas(): number {
    if (!this.sessaoAtual) return 0;
    const temaId = this.sessaoAtual.tema_id;
    if (temaId) {
      return queries.buscarCartasPorTema(temaId).length;
    }
    const todas = queries.buscarTodasCartas();
    if (todas.length > 0) return todas.length;
    return ((require('./models') as any).gameCards as any[]).length;
  }

  getCartaAtual(): Carta | null {
    if (!this.sessaoAtual) return null;
    
    const temaId = this.sessaoAtual.tema_id;
    let cartas;
    
    if (temaId) {
      cartas = queries.buscarCartasPorTema(temaId);
    } else {
      cartas = queries.buscarTodasCartas();
    }
    
    if (cartas.length === 0) {
      const gameCards = (require('./models') as any).gameCards;
      return gameCards[this.sessaoAtual.id_carta_atual] || null;
    }
    
    const carta = cartas[this.sessaoAtual.id_carta_atual];
    if (!carta) return null;
    
    return {
      id: carta.id,
      nome: carta.nome,
      dicas: JSON.parse(carta.dicas)
    };
  }

  getDicasReveladas(): number[] {
    if (!this.sessaoAtual) return [];
    try {
      return JSON.parse(this.sessaoAtual.dicas_reveladas);
    } catch {
      return [];
    }
  }

  calcularPontos(): number {
    const dicasReveladas = this.getDicasReveladas();
    const total = dicasReveladas.length;
    return total <= 1 ? 10 : Math.max(11 - total, 1);
  }

  getJogoIniciado(): boolean {
    return this.jogoIniciado;
  }

  getIdJogadorAtual(): string {
    if (!this.sessaoAtual || !this.sessaoAtual.id_jogador_atual) return '';
    const jogadores = this.getJogadores();
    const jogador = jogadores.find(j => j.id === this.sessaoAtual!.id_jogador_atual);
    return jogador?.id_socket || '';
  }

  getRevelouEstaTurno(): boolean {
    return this.revelouEstaTurno;
  }

  removerJogador(idSocket: string, permanente: boolean = false) {
    const jogador = this.jogadoresMap.get(idSocket);
    if (jogador) {
      console.log(`❌ ${jogador.nome_jogador} desconectou (memória), permanente: ${permanente}`);
      this.jogadoresMap.delete(idSocket);
      this.jogadoresMap.delete(`id:${jogador.id}`);

      if (permanente) {
        queries.removerJogador(idSocket);

        if (jogador.e_host && this.jogadoresMap.size > 0) {
          const novoHost = this.getJogadores()[0];
          novoHost.e_host = true;
          queries.atualizarJogador(novoHost.id, { eHost: 1 });
        }
      } else {
        queries.atualizarSocketJogador(jogador.id, '');
      }
    }
  }

  reiniciarJogo(): boolean {
    if (!this.sessaoAtual) return false;

    const jogadores = this.getJogadores();
    for (const j of jogadores) {
      j.pontuacao = 0;
      j.rolagem_dado = j.e_host ? 0 : null;
      j.e_turno_atual = false;
      queries.atualizarJogador(j.id, { pontuacao: 0, rolagemDado: j.e_host ? 0 : null, eTurnoAtual: 0 });
    }

    this.jogoIniciado = false;
    this.jogoEncerrado = false;
    this.sessaoAtual.id_carta_atual = 0;
    this.sessaoAtual.dicas_reveladas = '[]';
    this.sessaoAtual.esta_ativa = true; // manter a sessão ativa para jogar novamente
    this.sessaoAtual.id_jogador_atual = 0; // zerar quem é o jogador do turno
    this.atualizarSessao();
    this.cancelarTimerVez();

    // NÃO remover a sessão atual
    // this.sessaoAtual = null;
    console.log('🔄 Jogo reiniciado na mesma sessão');
    return true;
  }

  private atualizarSessao() {
    if (!this.sessaoAtual) return;
    queries.atualizarSessao(this.sessaoAtual.id, {
      idCartaAtual: this.sessaoAtual.id_carta_atual,
      dicasReveladas: this.sessaoAtual.dicas_reveladas,
      idJogadorAtual: this.sessaoAtual.id_jogador_atual,
      estaAtiva: this.sessaoAtual.esta_ativa ? 1 : 0,
      revelouEstaTurno: this.revelouEstaTurno ? 1 : 0,
    });
  }

  limparTudo() {
    this.cancelarTimerVez();
    this.jogadoresMap.clear();
    this.sessaoAtual = null;
    this.jogoIniciado = false;
    this.jogoEncerrado = false;
    this.revelouEstaTurno = false;
    queries.limparSessao();
    console.log('🧹 Estado limpo - memória e banco');
  }

  reativarJogador(idSocket: string, sessionId: string): Jogador | null {
    console.log('🔍 Tentando reativar jogador com sessionId:', sessionId);
    
    const allJogadores = queries.buscarJogadoresSessao(this.sessaoAtual?.id || 0);
    console.log('🔍 Todos os jogadores na sessão:', allJogadores.map((j: any) => ({ nome: j.nome_jogador, sessionId: j.session_id, idSocket: j.id_socket })));
    
    const jogadorExistente = queries.buscarJogadorPorSessionId(sessionId);
    if (!jogadorExistente) {
      console.log('❌ Jogador não encontrado no banco com sessionId:', sessionId);
      return null;
    }
    // Não reativar jogadores de sessões antigas
    if (jogadorExistente.id_sessao !== this.sessaoAtual?.id) {
      console.log('❌ SessionId pertence a sessão diferente:', jogadorExistente.id_sessao, '≠', this.sessaoAtual?.id);
      return null;
    }
    // Não roubar a identidade de um jogador ainda conectado com outro socket
    // (evita conflito quando dois jogadores usam o mesmo browser/localStorage)
    const socketAtual = jogadorExistente.id_socket ?? '';
    if (socketAtual !== '' && socketAtual !== idSocket) {
      console.log('❌ Jogador já conectado com socket diferente, não reativar');
      return null;
    }

    for (const [key, j] of this.jogadoresMap.entries()) {
      if (j.id === jogadorExistente.id) {
        this.jogadoresMap.delete(key);
      }
    }
    
    const jogador = mapDbToJogador(jogadorExistente);
    console.log('✅ Jogador encontrado no banco:', jogador.nome_jogador, 'id:', jogador.id);
    jogador.id_socket = idSocket;
    
    // Se o jogo recomeçou ou está no lobby, ninguém é o turno atual.
    if (this.sessaoAtual && this.sessaoAtual.id_jogador_atual === jogador.id && this.sessaoAtual.id_jogador_atual !== 0) {
      jogador.e_turno_atual = true;
    } else {
      jogador.e_turno_atual = false;
    }
    
    this.jogadoresMap.set(idSocket, jogador);
    this.jogadoresMap.set(`id:${jogador.id}`, jogador);

    queries.atualizarSocketJogador(jogador.id, idSocket);

    console.log(`✅ Jogador reativado: ${jogador.nome_jogador} (sessionId: ${sessionId}), turno_atual: ${jogador.e_turno_atual}, id_jogador_atual: ${this.sessaoAtual?.id_jogador_atual}, revelouEstaTurno: ${this.revelouEstaTurno}`);
    return jogador;
  }

  resetarEstadoTurno() {
    this.revelouEstaTurno = false;
  }

  reativarOuAdicionarJogador(idSocket: string, sessionId: string, nome: string): Jogador | null {
    const existing = this.getJogadorPorNome(nome);
    if (existing) {
      const reativado = this.reativarJogador(idSocket, sessionId);
      if (reativado) {
        console.log(`✅ Jogador existente reativado: ${nome}`);
        return reativado;
      }
    }

    const reativado = this.reativarJogador(idSocket, sessionId);
    if (reativado) {
      console.log(`✅ Jogador existente reativado por sessionId: ${nome}`);
      return reativado;
    }

    if (this.jogadoresMap.size >= 11) {
      return null;
    }

    return this.adicionarJogador(idSocket, sessionId, nome);
  }
}

export const gerenciadorJogo = new GerenciadorJogo();
