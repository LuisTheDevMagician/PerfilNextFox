'use client';

import React, { useEffect } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import { soundManager } from '@/lib/soundManager';

export function Modal({ children, borderColor }: { children: React.ReactNode; borderColor: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center animate-bounce"
        style={{ borderColor, borderWidth: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function CountdownRing({ timeLeft, visible, large = false }: {
  timeLeft: number;
  visible: boolean;
  large?: boolean;
}) {
  if (!visible) return null;
  const r = large ? 28 : 18;
  const strokeWidth = large ? 5 : 4;
  const size = large ? 68 : 46;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - Math.min(timeLeft, 40) / 40);
  const isUrgent = timeLeft <= 10;
  const color = isUrgent ? '#EF4444' : '#C4B5FD';

  return (
    <div className={isUrgent ? 'animate-pulse' : ''} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: large ? '1rem' : '0.7rem', fontWeight: 'bold', color,
      }}>
        {Math.ceil(timeLeft)}
      </span>
    </div>
  );
}

export function OverlayAcerto({ show, winnerName, correctAnswer, onDismiss }: {
  show: boolean;
  winnerName: string;
  correctAnswer: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    soundManager.play('answearRight');
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!show) return null;
  return (
    <Modal borderColor="rgba(34,197,94,0.4)">
      <CheckCircleIcon style={{ color: '#86EFAC', fontSize: 48 }} />
      <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#86EFAC' }}>CORRETO!</h2>
      <p style={{ color: 'rgba(255,255,255,0.7)' }}>
        <strong style={{ color: '#fff' }}>{winnerName}</strong> acertou!
      </p>
      <p className="font-bold text-lg mt-2" style={{ color: '#C4B5FD' }}>{correctAnswer}</p>
    </Modal>
  );
}

export function OverlayErro({ show, playerName, answer, onDismiss }: {
  show: boolean;
  playerName: string;
  answer: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    soundManager.play('answearWrong');
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!show) return null;
  return (
    <Modal borderColor="rgba(239,68,68,0.4)">
      <CancelIcon style={{ color: '#FCA5A5', fontSize: 48 }} />
      <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FCA5A5' }}>ERRADO!</h2>
      <p style={{ color: 'rgba(255,255,255,0.7)' }}>
        <strong style={{ color: '#fff' }}>{playerName}</strong> errou
      </p>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Resposta: <span className="font-bold" style={{ color: '#FCA5A5' }}>{answer}</span>
      </p>
      <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Vez do próximo jogador</p>
    </Modal>
  );
}

export function OverlayNinguemAcertou({ show, correctAnswer, onDismiss }: {
  show: boolean;
  correctAnswer: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    soundManager.play('noOneCorrect');
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!show) return null;
  return (
    <Modal borderColor="rgba(234,179,8,0.4)">
      <WarningIcon style={{ color: '#FDE68A', fontSize: 48 }} />
      <h2 className="text-2xl font-bold mt-3 mb-2" style={{ color: '#FDE68A' }}>NINGUÉM ACERTOU!</h2>
      <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>A resposta era:</p>
      <p className="font-bold text-lg" style={{ color: '#FDE68A' }}>&quot;{correctAnswer}&quot;</p>
    </Modal>
  );
}
