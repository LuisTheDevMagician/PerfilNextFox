'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket, getSessionId, disconnectSocket, clearSession, type WsClient } from '@/lib/socket';
import CasinoIcon from '@mui/icons-material/Casino';
import GroupIcon from '@mui/icons-material/Group';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SortIcon from '@mui/icons-material/Sort';
import StarIcon from '@mui/icons-material/Star';
import InfoIcon from '@mui/icons-material/Info';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface Player {
  id: string;
  name: string;
  diceRoll: number | null;
  score: number;
  isHost: boolean;
}

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const socketRef = useRef<WsClient | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Conectando...');

  const [disciplinas, setDisciplinas] = useState<{id: number, nome: string}[]>([]);
  const [temas, setTemas] = useState<{id: number, nome: string, disciplina_id: number}[]>([]);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<number>(0);
  const [temaSelecionado, setTemaSelecionado] = useState<number>(0);
  const [themeSelected, setThemeSelected] = useState(false);
  const [disciplinaNome, setDisciplinaNome] = useState('');
  const [temaNome, setTemaNome] = useState('');

  const playerNameParam = searchParams.get('nome') || '';

  useEffect(() => {
    const fromVictory = localStorage.getItem('perfil_from_victory');
    if (fromVictory) {
      localStorage.removeItem('perfil_from_victory');
    }
  }, []);

  useEffect(() => {
    const nameToUse = playerNameParam || localStorage.getItem('perfil_player_name') || '';

    if (!nameToUse) {
      router.push('/');
      return;
    }

    localStorage.setItem('perfil_player_name', nameToUse);

    const socket = getSocket();
    socketRef.current = socket;

    const sessionId = getSessionId();

    if (socket.connected) {
      setTimeout(() => {
        setIsConnecting(false);
        setConnectionStatus('Conectado!');
      }, 0);
      socket.emit('join-lobby', { nome: nameToUse, sessionId });
    }

    socket.on('connect', () => {
      setIsConnecting(false);
      setConnectionStatus('Conectado!');
      socket.emit('join-lobby', { nome: nameToUse, sessionId });
    });

    socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      setConnectionStatus('Erro de conexão. Tentando reconectar...');
      setError('Erro ao conectar ao servidor.');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Desconectado. Tentando reconectar...');
    });

    const deduplicatePlayers = (playerList: Player[]): Player[] => {
      return playerList.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);
    };

    socket.on('joined-lobby', ({ player, players: allPlayers }: { player: Player, players: Player[] }) => {
      setCurrentPlayer(player);
      setPlayers(deduplicatePlayers(allPlayers));
      setError('');
    });

    socket.on('player-joined', (updatedPlayers: Player[]) => {
      setPlayers(deduplicatePlayers(updatedPlayers));
    });

    socket.on('player-left', ({ players: updatedPlayers }: { playerId: string, players: Player[] }) => {
      setPlayers(deduplicatePlayers(updatedPlayers));
    });

    socket.on('dice-rolled', ({ playerId, diceRoll }: { playerId: string, playerName: string, diceRoll: number }) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, diceRoll } : p));
    });

    socket.on('play-order-set', (orderedPlayers: Player[]) => {
      setPlayers(orderedPlayers);
    });

    socket.on('theme-selected', ({ temaNome, disciplinaNome }: { temaNome: string, disciplinaNome: string }) => {
      setThemeSelected(true);
      setTemaNome(temaNome);
      setDisciplinaNome(disciplinaNome);
    });

    socket.on('game-started', () => {
      router.push('/game');
    });

    socket.on('lobby-full', () => {
      setError('Lobby cheio! Máximo de 11 jogadores.');
    });

    socket.on('name-taken', () => {
      setError('Este nome já está em uso. Escolha outro.');
    });

    socket.on('game-restarted', (updatedPlayers: Player[]) => {
      setPlayers(deduplicatePlayers(updatedPlayers));
      setError('');
    });

    socket.on('return-to-lobby', (updatedPlayers: Player[]) => {
      setPlayers(deduplicatePlayers(updatedPlayers));
      setError('');
    });

    socket.on('lobby-state', ({ players: lobbyPlayers }: { players: Player[] }) => {
      setPlayers(deduplicatePlayers(lobbyPlayers));
    });

    socket.emit('request-game-state');

    return () => {
      socket.off('game-restarted');
      socket.off('return-to-lobby');
      socket.off('lobby-state');
    };
  }, [router, playerNameParam]);

  useEffect(() => {
    if (currentPlayer?.isHost) {
      Promise.all([
        fetch('http://localhost:3001/api/disciplinas').then(r => r.json()),
        fetch('http://localhost:3001/api/temas').then(r => r.json()),
        fetch('http://localhost:3001/api/cartas').then(r => r.json())
      ]).then(([disc, temasData, cartasData]) => {
        setDisciplinas(disc);
        const temasComCartasIds = new Set(cartasData.map((c: { tema_id: number }) => c.tema_id));
        setTemas(temasData.filter((t: { id: number; nome: string; disciplina_id: number }) => temasComCartasIds.has(t.id)));
      });
    }
  }, [currentPlayer?.isHost]);

  const temasFiltrados = temas.filter(t => t.disciplina_id === disciplinaSelecionada);

  const handleSelectTema = () => {
    if (temaSelecionado) socketRef.current?.emit('select-theme', temaSelecionado);
  };

  const handleRollDice = () => {
    socketRef.current?.emit('roll-dice');
  };

  const handleSetPlayOrder = () => {
    socketRef.current?.emit('set-play-order');
  };

  const handleStartGame = () => {
    socketRef.current?.emit('start-game');
  };

  const handleSair = () => {
    if (socketRef.current) {
      socketRef.current.emit('sair-lobby');
      socketRef.current.disconnect();
    }
    disconnectSocket();
    localStorage.removeItem('perfil_player_name');
    clearSession();
    router.push('/');
  };

  const nonHostPlayers = players.filter(p => !p.isHost);
  const allPlayersRolled = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.diceRoll !== null);

  const selectStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: '0.75rem',
    padding: '0.6rem 1rem',
    width: '100%',
    fontSize: '0.95rem',
    outline: 'none',
    appearance: 'none' as const,
  };

  return (
    <div className="min-h-screen p-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Top bar */}
        <div className="panel rounded-2xl px-5 py-3 flex items-center justify-between">
          <button onClick={handleSair}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 hover:brightness-110"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            <ArrowBackIcon style={{ fontSize: '1rem' }} /> Sair
          </button>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', letterSpacing: '0.06em' }}>
            <span style={{ color: '#C4B5FD' }}>Perfil</span>
            <span style={{ color: '#EC4899' }}>Next</span>
            <span style={{ color: '#F97316' }}>Fox</span>
          </h1>

          <div className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-xs font-semibold"
            style={{
              background: isConnecting ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${isConnecting ? 'rgba(234,179,8,0.25)' : 'rgba(34,197,94,0.25)'}`,
              color: isConnecting ? '#FDE68A' : '#86EFAC',
            }}>
            {isConnecting ? '●  Conectando' : '●  Online'}
          </div>
        </div>

        {/* Role badge */}
        <div className="panel rounded-2xl px-5 py-3 text-center">
          {currentPlayer?.isHost ? (
            <span className="font-bold" style={{ color: '#FBBF24' }}>
              <StarIcon fontSize="small" className="mr-1" />Você é o HOST desta partida
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Aguardando o HOST iniciar a partida</span>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
            {error}
          </div>
        )}

        {/* Players list */}
        <div className="panel rounded-2xl p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <GroupIcon fontSize="small" />
            <span>Jogadores ({players.length}/11)</span>
          </h2>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors duration-150"
                style={{
                  background: player.id === currentPlayer?.id
                    ? 'rgba(124,58,237,0.12)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${player.id === currentPlayer?.id
                    ? 'rgba(124,58,237,0.3)'
                    : 'rgba(255,255,255,0.06)'}`,
                }}>
                <div className="flex items-center gap-2">
                  {player.isHost && <StarIcon fontSize="small" style={{ color: '#FBBF24' }} />}
                  <span className="font-semibold"
                    style={{ color: player.isHost ? '#FBBF24' : 'rgba(255,255,255,0.85)' }}>
                    {player.name}
                  </span>
                  {player.id === currentPlayer?.id && (
                    <span className="text-xs" style={{ color: 'rgba(196,181,253,0.7)' }}>
                      <PersonIcon fontSize="inherit" /> você
                    </span>
                  )}
                </div>
                <div>
                  {player.isHost ? (
                    <span className="text-xs font-bold" style={{ color: '#FBBF24' }}>Mestre</span>
                  ) : player.diceRoll !== null ? (
                    <span className="font-bold flex items-center gap-1"
                      style={{ color: player.id === currentPlayer?.id ? '#86EFAC' : 'rgba(255,255,255,0.7)' }}>
                      <CasinoIcon fontSize="small" /> {player.diceRoll}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>aguardando...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme config (HOST only) */}
        {currentPlayer?.isHost && !themeSelected && disciplinas.length > 0 && (
          <div className="panel rounded-2xl p-5"
            style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Configure o Jogo
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Disciplina</label>
                <select value={disciplinaSelecionada}
                  onChange={(e) => { setDisciplinaSelecionada(Number(e.target.value)); setTemaSelecionado(0); }}
                  style={selectStyle}>
                  <option value={0} style={{ background: '#14141f' }}>Selecione uma disciplina</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id} style={{ background: '#14141f' }}>{d.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tema</label>
                <select value={temaSelecionado}
                  onChange={(e) => setTemaSelecionado(Number(e.target.value))}
                  disabled={!disciplinaSelecionada}
                  style={{ ...selectStyle, opacity: disciplinaSelecionada ? 1 : 0.4 }}>
                  <option value={0} style={{ background: '#14141f' }}>Selecione um tema</option>
                  {temasFiltrados.map(t => (
                    <option key={t.id} value={t.id} style={{ background: '#14141f' }}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleSelectTema} disabled={!temaSelecionado}
                className="w-full py-2.5 rounded-xl font-bold text-white transition-all duration-200 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}>
                Confirmar Tema
              </button>
            </div>
          </div>
        )}

        {/* Theme confirmed */}
        {themeSelected && (
          <div className="panel rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
            <span style={{ color: '#86EFAC', fontSize: '1.2rem' }}>✓</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#86EFAC' }}>Tema confirmado</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{temaNome} · {disciplinaNome}</p>
            </div>
          </div>
        )}

        {/* Player actions */}
        {currentPlayer?.isHost === false && currentPlayer?.diceRoll === null && (
          <button onClick={handleRollDice}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
            <CasinoIcon /> Rolar Dados
          </button>
        )}

        {/* Host controls */}
        {currentPlayer?.isHost && (
          <div className="space-y-3">
            {allPlayersRolled && (
              <button onClick={handleSetPlayOrder}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #D97706, #F97316)', boxShadow: '0 4px 16px rgba(217,119,6,0.25)' }}>
                <SortIcon /> Definir Ordem de Jogo
              </button>
            )}
            <button onClick={handleStartGame} disabled={!themeSelected}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ background: themeSelected ? 'linear-gradient(135deg, #059669, #10B981)' : 'rgba(255,255,255,0.1)', boxShadow: themeSelected ? '0 4px 16px rgba(16,185,129,0.25)' : 'none' }}>
              <PlayArrowIcon /> {themeSelected ? 'Iniciar Partida' : 'Selecione um tema primeiro'}
            </button>
          </div>
        )}

        {/* How to play */}
        <div className="panel rounded-2xl px-5 py-4"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <h3 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <InfoIcon fontSize="small" /> Como Jogar
          </h3>
          <ol className="space-y-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <li>1. Cada jogador rola os dados para definir a ordem</li>
            <li>2. HOST seleciona o tema e inicia a partida</li>
            <li>3. Jogadores revelam dicas e tentam adivinhar</li>
            <li>4. Quem acertar com menos dicas ganha mais pontos</li>
          </ol>
        </div>

      </div>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-2xl">
          <p style={{ color: 'rgba(255,255,255,0.45)' }}>Carregando...</p>
        </div>
      </div>
    }>
      <LobbyContent />
    </Suspense>
  );
}
