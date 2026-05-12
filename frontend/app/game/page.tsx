'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket, getSessionId, type WsClient } from '@/lib/socket';
import { soundManager } from '@/lib/soundManager';
import { Card } from '@/lib/cards';
import StarIcon from '@mui/icons-material/Star';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckIcon from '@mui/icons-material/Check';
import SendIcon from '@mui/icons-material/Send';
import TimerIcon from '@mui/icons-material/Timer';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import WarningIcon from '@mui/icons-material/Warning';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import GroupIcon from '@mui/icons-material/Group';

interface Player {
  id: string;
  name: string;
  diceRoll: number | null;
  score: number;
  isHost: boolean;
}

interface Answer {
  id: number;
  playerId: string;
  playerName: string;
  answer: string;
  timestamp: number;
}

export default function GamePage() {
  const router = useRouter();
  const socketRef = useRef<WsClient | null>(null);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [revealedClueIndices, setRevealedClueIndices] = useState<number[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const isHostRef = useRef(false);
  const [myId, setMyId] = useState<string>('');
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [showErrorAnswer, setShowErrorAnswer] = useState(false);
  const [showNobodyGuessed, setShowNobodyGuessed] = useState(false);
  const [errorPlayerName, setErrorPlayerName] = useState('');
  const [errorAnswer, setErrorAnswer] = useState('');
  const [correctAnswerText, setCorrectAnswerText] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const isRevealingRef = useRef(false);
  const revealedCluesCountRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setMyId(socket.id || '');
      const sessionId = getSessionId?.() || localStorage.getItem('perfil_session_id') || '';
      const playerName = localStorage.getItem('perfil_player_name') || '';
      if (sessionId && playerName) socket.emit('join-lobby', { nome: playerName, sessionId });
      socket.emit('request-game-state');
    };

    const handleGameStarted = ({ currentCard: card, currentPlayerIndex: index, currentPlayerId: playerId, players: gamePlayers }: { currentCard: Card, currentPlayerIndex: number, currentPlayerId: string, players: Player[] }) => {
      revealedCluesCountRef.current = 0;
      setCurrentCard(card);
      setCurrentPlayerIndex(index);
      setCurrentPlayerId(playerId);
      const deduplicated = gamePlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);
      setPlayers(deduplicated);
      setShowCorrectAnswer(false);
      setShowNobodyGuessed(false);
      setIsLoading(false);
      const currentId = socket.id;
      const me = deduplicated.find((p: Player) => p.id === currentId);
      setIsHost(me?.isHost || false);
      isHostRef.current = me?.isHost || false;
      setMyId(currentId || '');
    };

    const handleClueRevealed = ({ revealedClueIndices: newRevealed, currentPlayerIndex: newIndex, currentPlayerId: newPlayerId, players: updatedPlayers }: { revealedClueIndices: number[], currentPlayerIndex: number, currentPlayerId: string, players?: Player[] }) => {
      if (newRevealed.length > revealedCluesCountRef.current) {
        soundManager.play('revealClue');
      } else {
        soundManager.play('passTurn');
      }
      revealedCluesCountRef.current = newRevealed.length;
      setRevealedClueIndices(newRevealed);
      setCurrentPlayerIndex(newIndex);
      setCurrentPlayerId(newPlayerId);
      if (updatedPlayers) setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
      setShowErrorAnswer(false);
      isRevealingRef.current = false;
    };

    const handleNewAnswer = (answer: Answer) => {
      setAnswers(prev => {
        const exists = prev.some(a => a.playerId === answer.playerId && a.timestamp === answer.timestamp);
        if (exists) return prev;
        return [...prev, answer];
      });
    };

    const handleAnswerCorrect = ({ playerName, correctAnswer, currentPlayerId: playerId, players: updatedPlayers }: { playerName: string, correctAnswer: string, currentPlayerId: string, players: Player[] }) => {
      soundManager.play('answearRight');
      setWinnerName(playerName);
      setCorrectAnswerText(correctAnswer);
      setShowCorrectAnswer(true);
      setCurrentPlayerId(playerId);
      setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
      setAnswers([]);
      setHasAnswered(false);
      setTimeout(() => { setShowCorrectAnswer(false); setPlayerAnswer(''); }, 3000);
    };

    const handleAnswerIncorrect = ({ playerName, answer, nextPlayerIndex, nextPlayerId, players: updatedPlayers }: { playerName: string, answer: string, nextPlayerIndex: number, nextPlayerId: string, players?: Player[] }) => {
      soundManager.play('answearWrong');
      setCurrentPlayerIndex(nextPlayerIndex);
      setCurrentPlayerId(nextPlayerId);
      if (updatedPlayers) setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
      setErrorPlayerName(playerName);
      setErrorAnswer(answer || '');
      setShowErrorAnswer(true);
      setTimeout(() => { setShowErrorAnswer(false); setErrorPlayerName(''); setErrorAnswer(''); }, 3000);
    };

    const handleNextCard = ({ currentCard: card, currentPlayerIndex: index, currentPlayerId: playerId, players: updatedPlayers }: { currentCard: Card, currentPlayerIndex: number, currentPlayerId: string, players?: Player[] }) => {
      revealedCluesCountRef.current = 0;
      setCurrentCard(card);
      setCurrentPlayerIndex(index);
      setCurrentPlayerId(playerId);
      if (updatedPlayers) setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
      setRevealedClueIndices([]);
      setShowCorrectAnswer(false);
      setShowErrorAnswer(false);
      setShowNobodyGuessed(false);
      setAnswers([]);
      setHasAnswered(false);
      isRevealingRef.current = false;
    };

    const handleGameEnded = ({ ranking: finalRanking }: { ranking: Player[] }) => {
      localStorage.setItem('perfil_ranking', JSON.stringify(finalRanking));
      localStorage.setItem('perfil_isHost', isHostRef.current ? 'true' : 'false');
      router.push('/victory');
    };

    const handleAnswersUpdated = (updatedAnswers: Answer[]) => { setAnswers(updatedAnswers); };

    const handleAnswerRevealed = ({ correctAnswer }: { correctAnswer: string }) => {
      soundManager.play('noOneCorrect');
      setCorrectAnswerText(correctAnswer);
      setShowNobodyGuessed(true);
      setTimeout(() => setShowNobodyGuessed(false), 3000);
    };

    const handleGameRestarted = () => { router.push('/lobby'); };

    const handleNextPlayer = ({ currentPlayerIndex: newIndex, currentPlayerId: newPlayerId, players: updatedPlayers }: { currentPlayerIndex: number, currentPlayerId: string, players?: Player[] }) => {
      setCurrentPlayerIndex(newIndex);
      setCurrentPlayerId(newPlayerId);
      if (updatedPlayers) setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
    };

    const handlePlayerLeft = ({ playerId, players: updatedPlayers }: { playerId: string, players: Player[] }) => {
      setPlayers(updatedPlayers.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i));
    };

    socket.on('connect', handleConnect);
    socket.on('game-started', handleGameStarted);
    socket.on('clue-revealed', handleClueRevealed);
    socket.on('new-answer', handleNewAnswer);
    socket.on('answer-correct', handleAnswerCorrect);
    socket.on('answer-incorrect', handleAnswerIncorrect);
    socket.on('next-card', handleNextCard);
    socket.on('game-ended', handleGameEnded);
    socket.on('victory-state', handleGameEnded);
    socket.on('answers-updated', handleAnswersUpdated);
    socket.on('answer-revealed', handleAnswerRevealed);
    socket.on('game-restarted', handleGameRestarted);
    socket.on('next-player', handleNextPlayer);
    socket.on('player-left', handlePlayerLeft);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('game-started');
      socket.off('clue-revealed');
      socket.off('new-answer', handleNewAnswer);
      socket.off('answer-correct');
      socket.off('answer-incorrect');
      socket.off('next-card');
      socket.off('game-ended');
      socket.off('victory-state');
      socket.off('answers-updated');
      socket.off('answer-revealed');
      socket.off('game-restarted');
      socket.off('next-player', handleNextPlayer);
      socket.off('player-left', handlePlayerLeft);
      socket.off('connect', handleConnect);
    };
  }, [router]);

  const handleRevealClue = () => {
    socketRef.current?.emit('pass-turn');
    isRevealingRef.current = false;
  };

  const handleRevealSpecificClue = (clueIndex: number) => {
    if (isRevealingRef.current) return;
    const myIndex = players.findIndex(p => p.id === myId);
    if (currentPlayerIndex !== myIndex) return;
    if (revealedClueIndices.includes(clueIndex)) return;
    isRevealingRef.current = true;
    socketRef.current?.emit('reveal-clue', clueIndex);
  };

  const handleSubmitAnswer = () => {
    if (!playerAnswer.trim() || hasAnswered || isSubmitting) return;
    soundManager.play('sendButton');
    setIsSubmitting(true);
    socketRef.current?.emit('submit-answer', playerAnswer.trim());
    setPlayerAnswer('');
    setHasAnswered(true);
    isRevealingRef.current = false;
    setTimeout(() => setIsSubmitting(false), 1000);
  };

  const handleValidateAnswer = (answerId: number, isCorrect: boolean) => {
    socketRef.current?.emit('validate-answer', { answerId, isCorrect });
  };

  const handleRevealAnswer = () => {
    if (revealedClueIndices.length >= 10) socketRef.current?.emit('reveal-answer');
  };

  const currentPoints = revealedClueIndices.length <= 1 ? 10 : Math.max(11 - revealedClueIndices.length, 1);
  const currentPlayer = players[currentPlayerIndex];

  // ── Loading ──
  if (isLoading || !currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#7C3AED' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Carregando jogo...</p>
        </div>
      </div>
    );
  }

  // ── Modal helpers ──
  const Modal = ({ children, borderColor }: { children: React.ReactNode, borderColor: string }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center animate-bounce"
        style={{ borderColor, borderWidth: 1 }}>
        {children}
      </div>
    </div>
  );

  // ── HOST view ──
  if (isHost) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Header */}
          <div className="panel rounded-2xl px-6 py-3 flex items-center justify-between">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.06em', color: '#FBBF24' }}>
              <StarIcon fontSize="small" className="mr-1" />Visão do HOST
            </h1>
            <div className="text-center">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.04em', color: '#C4B5FD' }}>
                {currentPoints}
              </span>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>pts em jogo</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">

            {/* Left: full card */}
            <div className="panel rounded-2xl p-5">
              <div className="rounded-xl px-4 py-3 mb-4 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.3), rgba(16,185,129,0.15))', border: '1px solid rgba(52,211,153,0.25)' }}>
                <p className="text-xs mb-1 tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Resposta Correta</p>
                <h2 className="font-bold text-xl" style={{ color: '#6EE7B7' }}>{currentCard.nome}</h2>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {currentCard.dicas.map((dica, index) => (
                  <div key={index} className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: revealedClueIndices.includes(index) ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${revealedClueIndices.includes(index) ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      color: revealedClueIndices.includes(index) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                    }}>
                    <span className="font-bold mr-2" style={{ color: revealedClueIndices.includes(index) ? '#86EFAC' : 'rgba(255,255,255,0.2)' }}>
                      {index + 1}.
                    </span>
                    {dica}
                  </div>
                ))}
              </div>

              {revealedClueIndices.length >= 10 ? (
                <button onClick={handleRevealAnswer}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #D97706, #F97316)' }}>
                  <MenuBookIcon /> Revelar Resposta e Passar
                </button>
              ) : (
                <div className="mt-4 py-3 rounded-xl text-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.25)' }}>
                  Host não revela dicas — jogador da vez controla
                </div>
              )}
            </div>

            {/* Right: score + answers */}
            <div className="space-y-4">

              {/* Host card */}
              <div className="panel rounded-2xl px-4 py-3"
                style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
                <p className="text-xs mb-2 font-bold tracking-widest uppercase" style={{ color: '#FBBF24' }}>
                  <StarIcon fontSize="inherit" className="mr-1" />Mestre da Partida
                </p>
                {players.filter(p => p.isHost).map((host) => (
                  <div key={host.id} className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: '#FBBF24' }}>{host.name}</span>
                    <span className="font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>{host.score} pts</span>
                  </div>
                ))}
              </div>

              {/* Scoreboard */}
              <div className="panel rounded-2xl p-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <SportsScoreIcon fontSize="small" /> Placar
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {players.filter(p => !p.isHost).map((player) => {
                    const playerIndex = players.findIndex(p => p.id === player.id);
                    const isActive = playerIndex === currentPlayerIndex;
                    return (
                      <div key={player.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{
                          background: isActive ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isActive ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                        <span className="text-sm flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {isActive && <NavigateNextIcon fontSize="small" style={{ color: '#FDE68A' }} />}
                          {player.name}
                        </span>
                        <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{player.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending answers */}
              <div className="panel rounded-2xl p-4 flex-1">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Respostas <ArrowRightAltIcon fontSize="small" /> {answers.length}
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {answers.length === 0 ? (
                    <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Aguardando respostas...</p>
                  ) : (
                    answers.map((answer) => (
                      <div key={answer.id} className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{answer.playerName}</p>
                        <p className="font-semibold text-sm mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>{answer.answer}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleValidateAnswer(answer.id, true)}
                            className="flex-1 py-1.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all duration-150 hover:brightness-110"
                            style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#86EFAC' }}>
                            <CheckIcon fontSize="small" /> Correto
                          </button>
                          <button onClick={() => handleValidateAnswer(answer.id, false)}
                            className="flex-1 py-1.5 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-all duration-150 hover:brightness-110"
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                            <CancelIcon fontSize="small" /> Errado
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCorrectAnswer && (
          <Modal borderColor="rgba(34,197,94,0.4)">
            <CheckCircleIcon style={{ color: '#86EFAC', fontSize: 48 }} />
            <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#86EFAC' }}>CORRETO!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: '#fff' }}>{winnerName}</strong> acertou!</p>
            <p className="font-bold text-lg mt-2" style={{ color: '#C4B5FD' }}>{correctAnswerText}</p>
          </Modal>
        )}

        {showErrorAnswer && (
          <Modal borderColor="rgba(239,68,68,0.4)">
            <CancelIcon style={{ color: '#FCA5A5', fontSize: 48 }} />
            <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FCA5A5' }}>ERRADO!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: '#fff' }}>{errorPlayerName}</strong> errou</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>&quot;{errorAnswer}&quot;</p>
          </Modal>
        )}

        {showNobodyGuessed && (
          <Modal borderColor="rgba(234,179,8,0.4)">
            <WarningIcon style={{ color: '#FDE68A', fontSize: 48 }} />
            <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FDE68A' }}>NINGUÉM ACERTOU!</h2>
            <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>A resposta era:</p>
            <p className="font-bold text-lg" style={{ color: '#FDE68A' }}>&quot;{correctAnswerText}&quot;</p>
          </Modal>
        )}
      </div>
    );
  }

  // ── Player view ──
  const isMyTurn = currentPlayerId === myId;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="panel rounded-2xl px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Vez de</p>
            <p className="font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{currentPlayer?.name}</p>
          </div>
          {isMyTurn && (
            <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm"
              style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)', color: '#FDE68A' }}>
              <WhatshotIcon fontSize="small" /> É sua vez!
            </span>
          )}
          <div className="text-right">
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', letterSpacing: '0.04em', color: '#C4B5FD' }}>
              {currentPoints}
            </span>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>pts em jogo</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">

          {/* Left: score column */}
          <div className="space-y-3">
            <div className="panel rounded-2xl p-4"
              style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
              <p className="text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#FBBF24' }}>
                <StarIcon fontSize="inherit" className="mr-1" />Mestre
              </p>
              {players.filter(p => p.isHost).map((host) => (
                <div key={host.id} className="flex justify-between">
                  <span className="font-bold text-sm" style={{ color: '#FBBF24' }}>{host.name}</span>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{host.score}</span>
                </div>
              ))}
            </div>

            <div className="panel rounded-2xl p-4">
              <h3 className="text-xs font-bold mb-3 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <GroupIcon fontSize="small" /> Jogadores
              </h3>
              <div className="space-y-1.5">
                {players.filter(p => !p.isHost).map((player) => {
                  const playerIndex = players.findIndex(p => p.id === player.id);
                  const isActive = playerIndex === currentPlayerIndex;
                  const isMe = player.id === myId;
                  return (
                    <div key={player.id}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg text-sm"
                      style={{
                        background: isActive ? 'rgba(234,179,8,0.08)' : isMe ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isActive ? 'rgba(234,179,8,0.25)' : isMe ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)'}`,
                      }}>
                      <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {isActive && <NavigateNextIcon fontSize="inherit" style={{ color: '#FDE68A' }} />}
                        {player.name}{isMe && ' (Você)'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{player.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main: clue cards + answer */}
          <div className="md:col-span-2 panel rounded-2xl p-5">
            <h2 className="text-xl font-bold text-center mb-4"
              style={{ color: showCorrectAnswer ? '#86EFAC' : 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
              {showCorrectAnswer ? correctAnswerText : '? ? ? ?'}
            </h2>

            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
              {currentCard.dicas.map((dica, index) => {
                const isRevealed = revealedClueIndices.includes(index);
                const hasPendingAnswers = answers.length > 0;
                const canReveal = isMyTurn && !isRevealed && revealedClueIndices.length < 10 && !hasPendingAnswers;

                return (
                  <div key={index}
                    onClick={() => canReveal && handleRevealSpecificClue(index)}
                    className="px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                    style={{
                      background: isRevealed
                        ? 'rgba(34,197,94,0.07)'
                        : canReveal
                        ? 'rgba(234,179,8,0.08)'
                        : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isRevealed
                        ? 'rgba(34,197,94,0.28)'
                        : canReveal
                        ? 'rgba(234,179,8,0.3)'
                        : 'rgba(255,255,255,0.05)'}`,
                      cursor: canReveal ? 'pointer' : 'default',
                    }}>
                    {isRevealed ? (
                      <>
                        <span className="font-bold mr-2" style={{ color: '#86EFAC' }}>{index + 1}.</span>
                        <span style={{ color: 'rgba(255,255,255,0.85)' }}>{dica}</span>
                      </>
                    ) : canReveal ? (
                      <span className="flex items-center gap-1.5" style={{ color: '#FDE68A' }}>
                        <VisibilityIcon fontSize="small" /> Clique para revelar a dica {index + 1}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        <VisibilityOffIcon fontSize="small" /> Dica bloqueada
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {isMyTurn && answers.length > 0 && (
              <div className="mb-3 px-3 py-2 rounded-lg text-sm text-center"
                style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#FED7AA' }}>
                <TimerIcon fontSize="small" className="mr-1" />Aguarde o host validar as respostas
              </div>
            )}

            {isMyTurn && revealedClueIndices.length < 10 && (
              <button onClick={handleRevealClue}
                className="w-full mb-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#FED7AA' }}>
                <NavigateNextIcon /> Passar a Vez
              </button>
            )}

            <div className="space-y-2">
              <input
                type="text"
                value={playerAnswer}
                onChange={(e) => setPlayerAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                placeholder={!isMyTurn ? 'Não é sua vez' : hasAnswered ? 'Você já respondeu' : 'Digite sua resposta...'}
                disabled={showCorrectAnswer || hasAnswered || !isMyTurn}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                onClick={handleSubmitAnswer}
                disabled={!playerAnswer.trim() || showCorrectAnswer || hasAnswered || isSubmitting || !isMyTurn}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 14px rgba(16,185,129,0.2)' }}>
                {hasAnswered ? <><CheckIcon /> Resposta Enviada</>
                  : isSubmitting ? <><TimerIcon /> Enviando...</>
                  : !isMyTurn ? <><LockIcon /> Aguarde sua vez</>
                  : <><SendIcon /> Enviar Resposta</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCorrectAnswer && (
        <Modal borderColor="rgba(34,197,94,0.4)">
          <CheckCircleIcon style={{ color: '#86EFAC', fontSize: 48 }} />
          <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#86EFAC' }}>CORRETO!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: '#fff' }}>{winnerName}</strong> acertou!</p>
          <p className="font-bold text-lg mt-2" style={{ color: '#C4B5FD' }}>{correctAnswerText}</p>
        </Modal>
      )}

      {showErrorAnswer && (
        <Modal borderColor="rgba(239,68,68,0.4)">
          <CancelIcon style={{ color: '#FCA5A5', fontSize: 48 }} />
          <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FCA5A5' }}>ERRADO!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}><strong style={{ color: '#fff' }}>{errorPlayerName}</strong> errou</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>&quot;{errorAnswer}&quot;</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Vez do próximo jogador</p>
        </Modal>
      )}

      {showNobodyGuessed && (
        <Modal borderColor="rgba(234,179,8,0.4)">
          <WarningIcon style={{ color: '#FDE68A', fontSize: 48 }} />
          <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FDE68A' }}>NINGUÉM ACERTOU!</h2>
          <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>A resposta era:</p>
          <p className="font-bold text-lg" style={{ color: '#FDE68A' }}>&quot;{correctAnswerText}&quot;</p>
        </Modal>
      )}
    </div>
  );
}
