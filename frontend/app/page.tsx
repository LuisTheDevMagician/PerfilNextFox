'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleJoinLobby = () => {
    if (!playerName.trim()) {
      setError('Por favor, digite um nome.');
      return;
    }
    router.push(`/lobby?nome=${encodeURIComponent(playerName.trim())}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.18) 0%, rgba(236,72,153,0.08) 45%, transparent 70%)' }} />

      <div className="glass rounded-3xl p-8 max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="PerfilNextFox"
            width={200}
            height={200}
            className="mx-auto mb-3"
            style={{ filter: 'drop-shadow(0 0 22px rgba(124,58,237,0.55)) drop-shadow(0 0 8px rgba(236,72,153,0.3))' }}
            priority
          />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Quiz Multiplayer · Até 8 jogadores
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="playerName" className="block text-sm font-semibold mb-2"
              style={{ color: 'rgba(255,255,255,0.55)' }}>
              Seu apelido
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinLobby()}
              placeholder="Como quer ser chamado?"
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl font-medium outline-none transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '1rem',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.7)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleJoinLobby}
            className="w-full py-3 rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            }}>
            Entrar no Lobby →
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-5 text-sm"
          style={{ color: 'rgba(255,255,255,0.28)' }}>
          <button onClick={() => router.push('/admin')}
            className="hover:text-white transition-colors duration-200">
            Administrador
          </button>
          <span>·</span>
          <button onClick={() => router.push('/sobre')}
            className="hover:text-white transition-colors duration-200">
            Sobre o Jogo
          </button>
        </div>
      </div>
    </div>
  );
}
