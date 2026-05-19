export type SoundName = 'answearRight' | 'answearWrong' | 'revealClue' | 'sendButton' | 'victoryScreenSound' | 'passTurn' | 'noOneCorrect' | 'rolldice';

const SOUND_PATHS: Record<SoundName, string> = {
  answearRight: '/sound/answearRight.mp3',
  answearWrong: '/sound/answearWrong.mp3',
  revealClue: '/sound/revealClue.mp3',
  sendButton: '/sound/sendButton.mp3',
  victoryScreenSound: '/sound/victoryScreenSound.mp3',
  passTurn: '/sound/passTurn.mp3',
  noOneCorrect: '/sound/noOneCorrect.mp3',
  rolldice: '/sound/rolldice.mp3',
};

class SoundManager {
  private static instance: SoundManager | null = null;
  private sounds: Partial<Record<SoundName, HTMLAudioElement>> = {};

  private constructor() {
    if (typeof window === 'undefined') return;
    for (const [name, path] of Object.entries(SOUND_PATHS) as [SoundName, string][]) {
      this.sounds[name] = new Audio(path);
    }
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  play(name: SoundName): void {
    const audio = this.sounds[name];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  stop(name: SoundName): void {
    const audio = this.sounds[name];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }
}

export const soundManager = SoundManager.getInstance();
