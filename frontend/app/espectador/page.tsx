'use client';

import { useEffect, useState } from 'react';
import { getSpectatorSocket } from '@/lib/spectatorSocket';
import { soundManager } from '@/lib/soundManager';
import { CountdownRing, OverlayAcerto, OverlayErro, OverlayNinguemAcertou } from '@/app/components/RespostasOverlay';
import StarIcon from '@mui/icons-material/Star';
import CasinoIcon from '@mui/icons-material/Casino';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Player {
  id: string;
  name: string;
  diceRoll: number | null;
  score: number;
  isHost: boolean;
}

interface Card {
  id: number;
  nome: string;
  dicas: string[];
}

const dedup = (list: Player[]) =>
  list.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);

export default function EspectadorPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [revealedClueIndices, setRevealedClueIndices] = useState<number[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [turnStartedAt, setTurnStartedAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [themeName, setThemeName] = useState('');
  const [disciplineName, setDisciplineName] = useState('');
  const [showCorrect, setShowCorrect] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showNobody, setShowNobody] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [correctAnswerText, setCorrectAnswerText] = useState('');
  const [errorPlayerName, setErrorPlayerName] = useState('');
  const [errorAnswer, setErrorAnswer] = useState('');
  const [ranking, setRanking] = useState<Player[]>([]);

  useEffect(() => {
    const socket = getSpectatorSocket();

    const handleSpectatorState = (data: any) => {
      setPlayers(dedup(data.players ?? []));
      if (data.gameStarted) {
        setGameStarted(true);
        setCurrentCard(data.currentCard ?? null);
        setRevealedClueIndices(data.revealedClueIndices ?? []);
        setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
        setCurrentPlayerId(data.currentPlayerId ?? '');
        setCurrentCardIndex(data.currentCardIndex ?? 0);
        setTotalCards(data.totalCards ?? 0);
        if (data.turnStartedAt) { setTurnStartedAt(data.turnStartedAt); setTimeLeft(40); }
      }
    };

    const handleLobbyState = (data: any) => setPlayers(dedup(data.players ?? []));
    const handlePlayerJoined = (p: Player[]) => setPlayers(dedup(p));
    const handlePlayerLeft = ({ players: p }: { playerId: string; players: Player[] }) => setPlayers(dedup(p));
    const handleDiceRolled = ({ playerId, diceRoll }: { playerId: string; playerName: string; diceRoll: number }) =>
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, diceRoll } : p));
    const handlePlayOrderSet = (p: Player[]) => setPlayers(dedup(p));
    const handleThemeSelected = ({ temaNome, disciplinaNome }: { temaNome: string; disciplinaNome: string }) => {
      setThemeName(temaNome);
      setDisciplineName(disciplinaNome);
    };

    const handleGameStarted = (data: any) => {
      setGameStarted(true);
      setGameEnded(false);
      setCurrentCard(data.currentCard ?? null);
      setRevealedClueIndices([]);
      setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
      setCurrentPlayerId(data.currentPlayerId ?? '');
      setCurrentCardIndex(data.currentCardIndex ?? 0);
      setTotalCards(data.totalCards ?? 0);
      setPlayers(dedup(data.players ?? []));
      if (data.turnStartedAt) { setTurnStartedAt(data.turnStartedAt); setTimeLeft(40); }
    };

    const handleClueRevealed = (data: any) => {
      setRevealedClueIndices(data.revealedClueIndices ?? []);
      setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
      setCurrentPlayerId(data.currentPlayerId ?? '');
      if (data.players) setPlayers(dedup(data.players));
      if (data.turnStartedAt) { setTurnStartedAt(data.turnStartedAt); setTimeLeft(40); }
    };

    const handleAnswerSubmitted = () => { setTurnStartedAt(0); setTimeLeft(40); };

    const handleAnswerCorrect = (data: any) => {
      setWinnerName(data.playerName ?? '');
      setCorrectAnswerText(data.correctAnswer ?? '');
      setShowCorrect(true);
      if (data.players) setPlayers(dedup(data.players));
      setTurnStartedAt(0);
      setTimeLeft(40);
    };

    const handleAnswerIncorrect = (data: any) => {
      setErrorPlayerName(data.playerName ?? '');
      setErrorAnswer(data.answer ?? '');
      setShowError(true);
      setCurrentPlayerIndex(data.nextPlayerIndex ?? 0);
      setCurrentPlayerId(data.nextPlayerId ?? '');
      if (data.players) setPlayers(dedup(data.players));
    };

    const handleNextCard = (data: any) => {
      setCurrentCard(data.currentCard ?? null);
      setRevealedClueIndices([]);
      setCurrentPlayerIndex(data.currentPlayerIndex ?? 0);
      setCurrentPlayerId(data.currentPlayerId ?? '');
      setCurrentCardIndex(data.currentCardIndex ?? 0);
      setTotalCards(data.totalCards ?? 0);
      if (data.players) setPlayers(dedup(data.players));
      if (data.turnStartedAt) { setTurnStartedAt(data.turnStartedAt); setTimeLeft(40); }
      setShowCorrect(false); setShowError(false); setShowNobody(false);
    };

    const handleAnswerRevealed = (data: any) => {
      setCorrectAnswerText(data.correctAnswer ?? '');
      setShowNobody(true);
      setTurnStartedAt(0);
      setTimeLeft(40);
    };

    const handleVictory = (data: any) => {
      soundManager.play('victoryScreenSound');
      setGameStarted(false);
      setGameEnded(true);
      setRanking(data.ranking ?? []);
    };

    const handleReturnToLobby = (updatedPlayers: Player[]) => {
      soundManager.stop('victoryScreenSound');
      setGameStarted(false);
      setGameEnded(false);
      setCurrentCard(null);
      setRevealedClueIndices([]);
      setThemeName('');
      setDisciplineName('');
      setRanking([]);
      setPlayers(dedup(updatedPlayers ?? []));
    };

    socket.on('spectator-state', handleSpectatorState);
    socket.on('lobby-state', handleLobbyState);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('dice-rolled', handleDiceRolled);
    socket.on('play-order-set', handlePlayOrderSet);
    socket.on('theme-selected', handleThemeSelected);
    socket.on('game-started', handleGameStarted);
    socket.on('clue-revealed', handleClueRevealed);
    socket.on('answer-submitted', handleAnswerSubmitted);
    socket.on('answer-correct', handleAnswerCorrect);
    socket.on('answer-incorrect', handleAnswerIncorrect);
    socket.on('next-card', handleNextCard);
    socket.on('answer-revealed', handleAnswerRevealed);
    socket.on('victory-state', handleVictory);
    socket.on('game-ended', handleVictory);
    socket.on('return-to-lobby', handleReturnToLobby);
    socket.on('game-restarted', handleReturnToLobby);

    return () => {
      socket.off('spectator-state');
      socket.off('lobby-state');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('dice-rolled');
      socket.off('play-order-set');
      socket.off('theme-selected');
      socket.off('game-started');
      socket.off('clue-revealed');
      socket.off('answer-submitted');
      socket.off('answer-correct');
      socket.off('answer-incorrect');
      socket.off('next-card');
      socket.off('answer-revealed');
      socket.off('victory-state');
      socket.off('game-ended');
      socket.off('return-to-lobby');
      socket.off('game-restarted');
    };
  }, []);

  useEffect(() => {
    if (turnStartedAt === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, 40 - (Date.now() - turnStartedAt) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [turnStartedAt]);

  const currentPoints = revealedClueIndices.length <= 1 ? 10 : Math.max(11 - revealedClueIndices.length, 1);
  const hostPlayer = players.find(p => p.isHost);
  const nonHostPlayers = players.filter(p => !p.isHost);
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // ── Tela de espera ──
  if (!gameStarted && !gameEnded) {
    return (
      <>
        <style>{`
          @keyframes float1 { 0%,100%{transform:rotate(-14deg) translateY(0)} 50%{transform:rotate(-14deg) translateY(-8px)} }
          @keyframes float2 { 0%,100%{transform:rotate(-2deg) translateY(0)} 50%{transform:rotate(-2deg) translateY(-6px)} }
          @keyframes float3 { 0%,100%{transform:rotate(13deg) translateY(0)} 50%{transform:rotate(13deg) translateY(-10px)} }
          @keyframes spin { to{transform:rotate(360deg)} }
        `}</style>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-6 max-w-sm w-full">

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', letterSpacing: '0.06em', lineHeight: 1 }}>
              <span style={{ color: '#C4B5FD' }}>Perfil</span>
              <span style={{ color: '#EC4899' }}>Next</span>
              <span style={{ color: '#F97316' }}>Fox</span>
            </h1>

            <div style={{ position: 'relative', width: 140, height: 80 }}>
              {[
                { bg: 'rgba(124,58,237,0.28)', border: 'rgba(196,181,253,0.3)', color: '#C4B5FD', left: 0,  top: 14, anim: 'float1 2.8s ease-in-out infinite' },
                { bg: 'rgba(236,72,153,0.22)', border: 'rgba(249,168,212,0.3)', color: '#F9A8D4', left: 50, top: 4,  anim: 'float2 3.2s ease-in-out infinite' },
                { bg: 'rgba(249,115,22,0.22)', border: 'rgba(254,215,170,0.3)', color: '#FED7AA', left: 96, top: 18, anim: 'float3 2.5s ease-in-out infinite' },
              ].map((c, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 38, height: 52, borderRadius: 6,
                  background: c.bg, border: `1px solid ${c.border}`,
                  left: c.left, top: c.top, animation: c.anim,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: c.color,
                }}>?</div>
              ))}
            </div>

            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.06)',
              borderTopColor: '#7C3AED',
              animation: 'spin 1s linear infinite',
            }} />

            <p className="text-center font-bold" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}>
              Aguardando o Host iniciar a Partida
            </p>

            {themeName && (
              <div className="px-4 py-2 rounded-xl text-sm text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86EFAC' }}>
                Tema: <strong>{themeName}</strong> · {disciplineName}
              </div>
            )}

            {players.length > 0 && (
              <div className="panel rounded-2xl p-4 w-full">
                <p className="text-xs font-bold mb-3 tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Jogadores na sala ({players.length})
                </p>
                <div className="space-y-2">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{
                        background: p.isHost ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${p.isHost ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      }}>
                      <span className="font-semibold flex items-center gap-1.5"
                        style={{ color: p.isHost ? '#FBBF24' : 'rgba(255,255,255,0.8)' }}>
                        {p.isHost && <StarIcon fontSize="inherit" />}
                        {p.name}
                      </span>
                      <span className="text-sm flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {p.isHost
                          ? 'Mestre'
                          : p.diceRoll !== null
                          ? <><CasinoIcon fontSize="inherit" /> {p.diceRoll}</>
                          : 'aguardando...'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Em jogo ──
  if (gameStarted) {
    return (
      <>
        <div className="min-h-screen p-3" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: '0.75rem' }}>

          {/* Topbar */}
          <div className="panel rounded-2xl px-5 py-2.5 flex items-center justify-between">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '0.06em' }}>
              <span style={{ color: '#C4B5FD' }}>Perfil</span>
              <span style={{ color: '#EC4899' }}>Next</span>
              <span style={{ color: '#F97316' }}>Fox</span>
            </h1>
            {totalCards > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Carta {currentCardIndex + 1} / {totalCards}
                </span>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 120, background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${((currentCardIndex + 1) / totalCards) * 100}%`, background: 'linear-gradient(90deg, #7C3AED, #C4B5FD)' }} />
                </div>
              </div>
            )}
            <div className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86EFAC' }}>
              ● Espectador
            </div>
          </div>

          {/* Dois painéis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: '0.75rem', minHeight: 0 }}>

            {/* Esquerda: carta e dicas */}
            <div className="panel rounded-2xl p-5 flex flex-col gap-3" style={{ overflow: 'hidden' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl" style={{ color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em' }}>
                  ❓ CARTA MISTERIOSA
                </h2>
                <div className="text-center">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#C4B5FD' }}>{currentPoints}</span>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>pts em jogo</p>
                </div>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                {(currentCard?.dicas ?? []).map((dica, i) => {
                  const revealed = revealedClueIndices.includes(i);
                  return (
                    <div key={i} className="px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: revealed ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.025)',
                        border: `1px solid ${revealed ? 'rgba(34,197,94,0.28)' : 'rgba(255,255,255,0.05)'}`,
                        color: revealed ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
                      }}>
                      <span className="font-bold mr-2" style={{ color: revealed ? '#86EFAC' : 'rgba(255,255,255,0.15)' }}>
                        {i + 1}.
                      </span>
                      {revealed ? dica : '????????????????????'}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direita: placar e timer */}
            <div className="flex flex-col gap-3">

              {hostPlayer && (
                <div className="panel rounded-2xl px-4 py-3" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
                  <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#FBBF24' }}>
                    <StarIcon fontSize="inherit" className="mr-1" />Mestre
                  </p>
                  <span className="font-bold" style={{ color: '#FBBF24' }}>{hostPlayer.name}</span>
                </div>
              )}

              <div className="panel rounded-2xl px-4 py-3">
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Vez de</p>
                <div className="flex items-center gap-3">
                  <CountdownRing timeLeft={timeLeft} visible={turnStartedAt > 0} large />
                  <span className="font-bold text-lg" style={{ color: '#FDE68A' }}>
                    {currentPlayer?.name ?? '—'}
                  </span>
                </div>
              </div>

              <div className="panel rounded-2xl p-4 flex-1" style={{ overflow: 'hidden' }}>
                <h3 className="text-xs font-bold mb-3 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Placar
                </h3>
                <div className="space-y-1.5 overflow-y-auto max-h-72">
                  {nonHostPlayers.map(p => {
                    const isActive = p.id === currentPlayerId;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{
                          background: isActive ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        <span className="text-sm flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {isActive && <NavigateNextIcon fontSize="small" style={{ color: '#FDE68A' }} />}
                          {p.name}
                        </span>
                        <span className="font-bold text-sm" style={{ color: isActive ? '#FDE68A' : 'rgba(255,255,255,0.5)' }}>
                          {p.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <OverlayAcerto
          show={showCorrect}
          winnerName={winnerName}
          correctAnswer={correctAnswerText}
          onDismiss={() => setShowCorrect(false)}
        />
        <OverlayErro
          show={showError}
          playerName={errorPlayerName}
          answer={errorAnswer}
          onDismiss={() => {
            setShowError(false);
            setErrorPlayerName('');
            setErrorAnswer('');
            setTurnStartedAt(Date.now());
            setTimeLeft(40);
          }}
        />
        <OverlayNinguemAcertou
          show={showNobody}
          correctAnswer={correctAnswerText}
          onDismiss={() => setShowNobody(false)}
        />
      </>
    );
  }

  // ── Fim de jogo ──
  const medals = ['🥇', '🥈', '🥉'];
  const winner = ranking[0];
  return (
    <>
      <style>{`
        @keyframes trophy-glow-v {
          0%,100%{filter:drop-shadow(0 0 14px rgba(251,191,36,0.55))}
          50%{filter:drop-shadow(0 0 28px rgba(251,191,36,0.85)) drop-shadow(0 0 56px rgba(249,115,22,0.35))}
        }
        .trophy-anim-v{animation:trophy-glow-v 2.5s ease-in-out infinite}
      `}</style>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 25%, rgba(251,191,36,0.1) 0%, rgba(249,115,22,0.06) 45%, transparent 70%)' }} />
        <div className="glass rounded-3xl p-8 max-w-md w-full relative z-10 text-center">
          <div className="trophy-anim-v mb-3 flex justify-center">
            <EmojiEventsIcon sx={{ fontSize: 68, color: '#FBBF24' }} />
          </div>
          <h1 className="mb-6" style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(42px,10vw,66px)',
            letterSpacing: '0.06em', lineHeight: 1,
            background: 'linear-gradient(135deg, #FBBF24, #F97316)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Fim de Jogo!
          </h1>
          {winner && (
            <div className="rounded-2xl p-4 mb-5"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.12))', border: '1px solid rgba(196,181,253,0.2)' }}>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Vencedor</p>
              <p className="font-bold text-2xl" style={{ color: '#C4B5FD' }}>{winner.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)' }}>{winner.score} pontos</p>
            </div>
          )}
          <div className="rounded-2xl p-4 mb-5 space-y-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-xs font-bold mb-3 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Ranking Final
            </h2>
            {ranking.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  background: i === 0 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.05)'}`,
                }}>
                <div className="flex items-center gap-2">
                  <span>{medals[i] ?? `${i + 1}°`}</span>
                  <span className="font-semibold" style={{ color: i === 0 ? '#FBBF24' : 'rgba(255,255,255,0.8)' }}>{p.name}</span>
                </div>
                <span className="font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>{p.score} pts</span>
              </div>
            ))}
          </div>
          <div className="py-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Aguardando o Host...</p>
          </div>
        </div>
      </div>
    </>
  );
}
