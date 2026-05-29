'use client';

import { useRouter } from 'next/navigation';
import { Bebas_Neue, Nunito } from 'next/font/google';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'] });
const nunito = Nunito({ subsets: ['latin'] });

const steps = [
  {
    number: '01',
    title: 'O HOST Comanda',
    color: '#7C3AED',
    text: 'O primeiro a entrar vira o HOST. Ele vê a carta completa, todas as dicas e a resposta. Os demais jogadores rolam dados para definir a ordem de turnos.',
  },
  {
    number: '02',
    title: 'Dicas Progressivas',
    color: '#EC4899',
    text: 'Cada carta começa valendo 10 pontos. O jogador da vez revela dicas uma a uma. A cada nova dica, a pontuação cai 1 ponto. Menos dicas, mais pontos!',
  },
  {
    number: '03',
    title: 'Responda a Qualquer Hora',
    color: '#F97316',
    text: 'Qualquer jogador pode enviar uma resposta a qualquer momento. O HOST valida: acerto garante os pontos e mantém o turno; erro passa a vez.',
  },
  {
    number: '04',
    title: 'Vença o Ranking',
    color: '#FBBF24',
    text: 'Ao fim de todas as rodadas, quem tiver mais pontos vence. O HOST pode reiniciar ou criar uma nova partida com o mesmo grupo.',
  },
];

const nameCards = [
  {
    word: 'Perfil',
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.4)',
    label: 'A Inspiração',
    desc: 'Homenagem ao jogo de tabuleiro brasileiro. A mecânica de dicas progressivas é fiel à versão original que marcou gerações.',
  },
  {
    word: 'Next',
    color: '#EC4899',
    glow: 'rgba(236,72,153,0.4)',
    label: 'O Framework',
    desc: 'O frontend roda em Next.js 16 com App Router. React moderno, rápido, renderizado no servidor.',
  },
  {
    word: 'Fox',
    color: '#F97316',
    glow: 'rgba(249,115,22,0.4)',
    label: 'O Backend',
    desc: 'O servidor usa Elysia.js no runtime Bun. A raposa é o mascote do ecossistema Elysia, veloz e elegante.',
  },
];

export default function SobrePage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-22px) rotate(2deg); }
        }
        @keyframes glow-cycle {
          0%   { filter: drop-shadow(0 0 24px #7C3AED) drop-shadow(0 0 48px rgba(124,58,237,0.4)); }
          50%  { filter: drop-shadow(0 0 36px #EC4899) drop-shadow(0 0 72px rgba(236,72,153,0.4)); }
          100% { filter: drop-shadow(0 0 24px #F97316) drop-shadow(0 0 48px rgba(249,115,22,0.4)); }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%       { transform: translate(80px,-50px) scale(1.15); }
          70%       { transform: translate(-30px, 40px) scale(0.9); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          35%       { transform: translate(-90px, 60px) scale(1.2); }
          65%       { transform: translate(60px,-30px) scale(0.85); }
        }
        @keyframes orb3 {
          0%, 100% { transform: translate(0,0); }
          50%       { transform: translate(40px, 70px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(6px); opacity: 1; }
        }

        .float-q  { animation: float 5s ease-in-out infinite; }
        .glow-q   { animation: glow-cycle 4s ease-in-out infinite; }
        .orb-a    { animation: orb1 14s ease-in-out infinite; }
        .orb-b    { animation: orb2 18s ease-in-out infinite; }
        .orb-c    { animation: orb3 10s ease-in-out infinite; }
        .bounce-dot { animation: bounce-dot 1.4s ease-in-out infinite; }

        .fu1 { animation: fade-up 0.7s ease both; animation-delay: 0.05s; }
        .fu2 { animation: fade-up 0.7s ease both; animation-delay: 0.2s; }
        .fu3 { animation: fade-up 0.7s ease both; animation-delay: 0.35s; }
        .fu4 { animation: fade-up 0.7s ease both; animation-delay: 0.5s; }
        .fu5 { animation: fade-up 0.7s ease both; animation-delay: 0.65s; }

        .glass {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
        }
        .glass:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,255,255,0.12);
        }
        .name-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .name-card:hover {
          transform: translateY(-6px) scale(1.02);
        }
        .step-row {
          transition: background 0.25s ease, border-color 0.25s ease;
        }
      `}</style>

      <div className={`${nunito.className} min-h-screen`} style={{ background: '#07070E', color: '#fff' }}>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 text-center">

          {/* Ambient orbs */}
          <div className="orb-a pointer-events-none absolute"
            style={{ top: '15%', left: '10%', width: 480, height: 480,
              background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 68%)',
              filter: 'blur(48px)', borderRadius: '50%' }} />
          <div className="orb-b pointer-events-none absolute"
            style={{ bottom: '10%', right: '8%', width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(236,72,153,0.22) 0%, transparent 68%)',
              filter: 'blur(48px)', borderRadius: '50%' }} />
          <div className="orb-c pointer-events-none absolute"
            style={{ top: '55%', left: '55%', width: 280, height: 280,
              background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 68%)',
              filter: 'blur(48px)', borderRadius: '50%' }} />

          {/* Question mark */}
          <div className="float-q glow-q fu1 select-none"
            style={{
              fontSize: 'clamp(120px, 22vw, 200px)',
              lineHeight: 1,
              fontFamily: bebas.style.fontFamily,
              background: 'linear-gradient(160deg, #A78BFA 0%, #EC4899 50%, #F97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.1em',
            }}>
            ?
          </div>

          {/* Game title */}
          <h1 className="fu2" style={{ fontFamily: bebas.style.fontFamily,
            fontSize: 'clamp(48px, 11vw, 104px)', letterSpacing: '0.06em', lineHeight: 1 }}>
            <span style={{ color: '#C4B5FD' }}>Perfil</span>
            <span style={{ color: '#EC4899' }}>Next</span>
            <span style={{ color: '#F97316' }}>Fox</span>
          </h1>

          {/* Tagline */}
          <p className="fu3 mt-5 text-base md:text-xl max-w-lg"
            style={{ color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>
            O clássico jogo de adivinhação brasileiro — agora em tempo real,
            no navegador, com até <strong style={{ color: 'rgba(255,255,255,0.85)' }}>8 jogadores</strong>.
          </p>

          {/* CTA */}
          <button className="fu4 mt-10 px-10 py-3.5 rounded-full font-bold text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
            onClick={() => router.push('/')}
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              boxShadow: '0 0 32px rgba(124,58,237,0.45), 0 4px 16px rgba(0,0,0,0.4)',
              fontSize: '1rem',
            }}>
            Jogar Agora →
          </button>

          {/* Scroll hint */}
          <div className="fu5 absolute bottom-10 flex flex-col items-center gap-1.5"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Saiba mais</span>
            <div className="bounce-dot w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
            <div className="bounce-dot w-1 h-1 rounded-full" style={{ animationDelay: '0.2s', background: 'rgba(255,255,255,0.25)' }} />
            <div className="bounce-dot w-1 h-1 rounded-full" style={{ animationDelay: '0.4s', background: 'rgba(255,255,255,0.12)' }} />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            INSPIRAÇÃO
        ══════════════════════════════════════════ */}
        <section className="px-4 py-20 max-w-3xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12 relative overflow-hidden transition-all duration-300">
            {/* Watermark */}
            <div className="pointer-events-none absolute -top-8 -right-4 leading-none select-none"
              style={{ fontFamily: bebas.style.fontFamily, fontSize: 200,
                color: 'rgba(124,58,237,0.06)', letterSpacing: '0.05em' }}>
              01
            </div>

            <span style={{ color: '#7C3AED', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              A Origem
            </span>
            <h2 className="mt-2 mb-6"
              style={{ fontFamily: bebas.style.fontFamily, fontSize: 'clamp(32px,6vw,52px)',
                letterSpacing: '0.05em', lineHeight: 1.1 }}>
              Inspirado no Tabuleiro
            </h2>
            <p className="mb-4 text-base md:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              O <strong style={{ color: '#fff' }}>PerfilNextFox</strong> nasce do carinho pelo jogo de tabuleiro{' '}
              <strong style={{ color: '#fff' }}>Perfil</strong> — um dos mais queridos das noites em família
              no Brasil. A proposta é simples e viciante: descubra a{' '}
              <span style={{ color: '#EC4899' }}>entidade secreta</span> através de{' '}
              <span style={{ color: '#F97316' }}>dicas progressivas</span>. Menos dicas, mais pontos.
            </p>
            <p className="text-base md:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Pegamos essa essência e transformamos em experiência digital moderna:{' '}
              websockets em tempo real, suporte a múltiplos dispositivos e conteúdo
              totalmente customizável pelo administrador.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COMO SE JOGA
        ══════════════════════════════════════════ */}
        <section className="px-4 py-10 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span style={{ color: '#EC4899', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Mecânica
            </span>
            <h2 className="mt-2"
              style={{ fontFamily: bebas.style.fontFamily, fontSize: 'clamp(32px,6vw,52px)',
                letterSpacing: '0.05em', lineHeight: 1.1 }}>
              Como Se Joga
            </h2>
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.number} className="step-row glass rounded-2xl px-6 py-5 flex gap-5 items-start"
                style={{ borderColor: `${step.color}1A` }}>
                <span className="shrink-0 leading-none"
                  style={{ fontFamily: bebas.style.fontFamily, fontSize: 'clamp(44px,8vw,64px)',
                    color: step.color, textShadow: `0 0 20px ${step.color}55`,
                    letterSpacing: '0.04em', lineHeight: 1 }}>
                  {step.number}
                </span>
                <div className="pt-1">
                  <h3 className="font-bold text-base mb-1" style={{ color: step.color }}>{step.title}</h3>
                  <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            O NOME
        ══════════════════════════════════════════ */}
        <section className="px-4 py-20 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span style={{ color: '#F97316', fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
              Identidade
            </span>
            <h2 className="mt-2"
              style={{ fontFamily: bebas.style.fontFamily, fontSize: 'clamp(32px,6vw,52px)',
                letterSpacing: '0.05em', lineHeight: 1.1 }}>
              Por Trás do Nome
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {nameCards.map((item) => (
              <div key={item.word} className="name-card glass rounded-2xl p-6 text-center cursor-default"
                style={{ borderColor: `${item.color}22`,
                  boxShadow: `0 0 0 0 ${item.glow}` }}>
                <div className="mb-3 leading-none"
                  style={{ fontFamily: bebas.style.fontFamily, fontSize: 'clamp(52px,10vw,72px)',
                    color: item.color, textShadow: `0 0 28px ${item.glow}`,
                    letterSpacing: '0.05em' }}>
                  {item.word}
                </div>
                <div className="mb-2" style={{ color: item.color, fontSize: '0.65rem',
                  letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            STATS BANNER
        ══════════════════════════════════════════ */}
        <section className="px-4 py-10 max-w-3xl mx-auto">
          <div className="rounded-3xl px-8 py-12 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(236,72,153,0.09), rgba(249,115,22,0.14))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            {/* Inner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 60%)' }} />

            <div className="relative flex justify-center gap-10 md:gap-20 mb-8">
              {[
                { value: '11', label: 'Jogadores', color: '#A78BFA' },
                { value: '∞', label: 'Partidas', color: '#EC4899' },
                { value: '0', label: 'Instalação', color: '#F97316' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div style={{ fontFamily: bebas.style.fontFamily,
                    fontSize: 'clamp(48px,10vw,72px)', color: stat.color,
                    textShadow: `0 0 24px ${stat.color}66`, letterSpacing: '0.04em', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem',
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.3em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="relative text-base md:text-lg max-w-sm mx-auto"
              style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Todos na mesma rede Wi-Fi. Sem download, sem cadastro.
              Abra o navegador e jogue.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════ */}
        <footer className="px-4 pt-10 pb-16 text-center">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.75)',
            }}>
            ← Voltar ao Início
          </button>
          <p className="mt-8" style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.75rem',
            letterSpacing: '0.1em' }}>
            PERFILNEXTFOX — INSPIRADO NO JOGO PERFIL
          </p>
        </footer>

      </div>
    </>
  );
}
