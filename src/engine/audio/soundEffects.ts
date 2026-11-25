// ============================================================================
// BRUTE LEGENDS — Procedural Web Audio SFX Engine (Zero external audio files)
// ============================================================================

export type SoundEffectType =
  | 'click'
  | 'hit'
  | 'heavy_hit'
  | 'crit'
  | 'dodge'
  | 'block'
  | 'special'
  | 'coin'
  | 'level_up'
  | 'victory'
  | 'defeat'
  | 'equip'
  | 'chest';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.45;

  public configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainScale = 1,
    delay = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);

    const peak = Math.max(0.001, this.volume * 0.35 * gainScale);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public play(effect: SoundEffectType): void {
    if (!this.enabled) return;
    try {
      switch (effect) {
        case 'click':
          this.playTone(520, 740, 0.055, 'triangle', 0.55);
          break;
        case 'hit':
          this.playTone(230, 75, 0.11, 'sawtooth', 0.75);
          this.playTone(140, 55, 0.09, 'square', 0.4, 0.01);
          break;
        case 'heavy_hit':
          this.playTone(180, 42, 0.22, 'sawtooth', 1.0);
          this.playTone(95, 36, 0.24, 'triangle', 0.9, 0.02);
          break;
        case 'crit':
          this.playTone(440, 880, 0.1, 'square', 0.7);
          this.playTone(660, 1280, 0.16, 'triangle', 0.85, 0.05);
          this.playTone(160, 48, 0.18, 'sawtooth', 0.9);
          break;
        case 'dodge':
          this.playTone(420, 920, 0.13, 'sine', 0.65);
          break;
        case 'block':
          this.playTone(640, 320, 0.12, 'square', 0.7);
          this.playTone(980, 760, 0.09, 'triangle', 0.5, 0.02);
          break;
        case 'special':
          this.playTone(260, 620, 0.18, 'sawtooth', 0.75);
          this.playTone(520, 1180, 0.24, 'triangle', 0.85, 0.09);
          this.playTone(180, 65, 0.25, 'square', 0.75, 0.18);
          break;
        case 'coin':
          this.playTone(987, 1318, 0.09, 'sine', 0.6);
          this.playTone(1318, 1567, 0.12, 'triangle', 0.55, 0.05);
          break;
        case 'equip':
          this.playTone(380, 620, 0.08, 'triangle', 0.65);
          this.playTone(540, 820, 0.1, 'sine', 0.55, 0.05);
          break;
        case 'chest':
          this.playTone(440, 554, 0.12, 'triangle', 0.7, 0);
          this.playTone(554, 659, 0.12, 'triangle', 0.7, 0.08);
          this.playTone(659, 880, 0.22, 'sine', 0.85, 0.16);
          break;
        case 'level_up':
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            this.playTone(freq, freq * 1.03, 0.18, 'triangle', 0.8, idx * 0.08);
          });
          break;
        case 'victory':
          [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
            this.playTone(freq, freq * 1.02, 0.2, 'triangle', 0.8, idx * 0.09);
          });
          break;
        case 'defeat':
          [392, 349.23, 311.13, 261.63].forEach((freq, idx) => {
            this.playTone(freq, freq * 0.94, 0.22, 'sawtooth', 0.55, idx * 0.12);
          });
          break;
      }
    } catch {
      // Ignore audio errors on locked contexts
    }
  }
}

export const soundEngine = new SoundEngine();
