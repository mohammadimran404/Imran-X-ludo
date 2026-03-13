/* ============================================
   IMRAN X LUDO — Sound System
   Uses Web Audio API (no external files needed)
   ============================================ */

const SoundSystem = (() => {
  let audioCtx = null;
  let enabled = true;

  const STORAGE_KEY = 'imranXLudoSound';

  function getCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    // Resume if suspended (needed after user gesture)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function isEnabled() {
    return enabled;
  }

  function setEnabled(val) {
    enabled = val;
    localStorage.setItem(STORAGE_KEY, val ? '1' : '0');
  }

  function loadEnabled() {
    const stored = localStorage.getItem(STORAGE_KEY);
    enabled = stored !== '0'; // default on
    return enabled;
  }

  // ─── Core Oscillator ────────────────────────────────────────────────────────
  function playTone({ freq = 440, type = 'sine', duration = 0.15, volume = 0.25, delay = 0, attack = 0.01, release = 0.1 }) {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    const osc   = ctx.createOscillator();
    const gain  = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type      = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + release);
  }

  // ─── Sound Effects ──────────────────────────────────────────────────────────

  function playDiceRoll() {
    // Rapid staccato clicks
    for (let i = 0; i < 8; i++) {
      playTone({
        freq: 200 + Math.random() * 400,
        type: 'square',
        duration: 0.04,
        volume: 0.08,
        delay: i * 0.055,
        attack: 0.005,
        release: 0.02
      });
    }
    // Final "land" thud
    playTone({ freq: 100, type: 'triangle', duration: 0.15, volume: 0.2, delay: 0.45, attack: 0.005 });
  }

  function playDiceResult(value) {
    // Play chime based on dice value
    const notes = [220, 262, 294, 330, 392, 440, 523];
    const freq = notes[value] || 440;
    playTone({ freq, type: 'sine', duration: 0.3, volume: 0.3, attack: 0.02, release: 0.2 });
    if (value === 6) {
      // Bonus sparkle for 6
      playTone({ freq: freq * 2, type: 'sine', duration: 0.2, volume: 0.15, delay: 0.1, attack: 0.01 });
      playTone({ freq: freq * 3, type: 'sine', duration: 0.15, volume: 0.1, delay: 0.2, attack: 0.01 });
    }
  }

  function playTokenMove() {
    playTone({ freq: 880, type: 'sine', duration: 0.08, volume: 0.15, attack: 0.005 });
    playTone({ freq: 1100, type: 'sine', duration: 0.06, volume: 0.1, delay: 0.06, attack: 0.005 });
  }

  function playTokenCapture() {
    // Descending crash
    playTone({ freq: 600, type: 'sawtooth', duration: 0.1, volume: 0.2, attack: 0.005 });
    playTone({ freq: 400, type: 'sawtooth', duration: 0.15, volume: 0.25, delay: 0.08 });
    playTone({ freq: 200, type: 'square',   duration: 0.2,  volume: 0.2,  delay: 0.18 });
  }

  function playTokenHome() {
    // Happy ascending arpeggio
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((freq, i) => {
      playTone({ freq, type: 'sine', duration: 0.2, volume: 0.2, delay: i * 0.1, attack: 0.01, release: 0.1 });
    });
  }

  function playSixRoll() {
    // Exciting fanfare
    [523, 659, 784].forEach((freq, i) => {
      playTone({ freq, type: 'triangle', duration: 0.25, volume: 0.25, delay: i * 0.08 });
    });
  }

  function playWin() {
    // Victory fanfare
    const melody = [
      { freq: 523, delay: 0 },
      { freq: 659, delay: 0.12 },
      { freq: 784, delay: 0.24 },
      { freq: 1047, delay: 0.36 },
      { freq: 784, delay: 0.5 },
      { freq: 1047, delay: 0.62 },
      { freq: 1319, delay: 0.78 },
    ];
    melody.forEach(({ freq, delay }) => {
      playTone({ freq, type: 'sine', duration: 0.3, volume: 0.3, delay, attack: 0.02, release: 0.15 });
    });

    // Add harmony
    setTimeout(() => {
      [523, 659, 784].forEach((freq, i) => {
        playTone({ freq, type: 'triangle', duration: 0.8, volume: 0.15, delay: i * 0.05 });
      });
    }, 900);
  }

  function playButtonClick() {
    playTone({ freq: 800, type: 'sine', duration: 0.06, volume: 0.1, attack: 0.005, release: 0.03 });
  }

  function playError() {
    playTone({ freq: 200, type: 'square', duration: 0.2, volume: 0.2, attack: 0.005 });
    playTone({ freq: 160, type: 'square', duration: 0.3, volume: 0.2, delay: 0.18 });
  }

  function playTurnStart() {
    playTone({ freq: 660, type: 'sine', duration: 0.15, volume: 0.2, attack: 0.01 });
    playTone({ freq: 880, type: 'sine', duration: 0.15, volume: 0.15, delay: 0.12 });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  function init() {
    loadEnabled();
    // Warm up audio context on first user gesture
    document.addEventListener('click', () => getCtx(), { once: true });
    document.addEventListener('touchstart', () => getCtx(), { once: true });
  }

  return {
    init,
    isEnabled,
    setEnabled,
    loadEnabled,
    playDiceRoll,
    playDiceResult,
    playTokenMove,
    playTokenCapture,
    playTokenHome,
    playSixRoll,
    playWin,
    playButtonClick,
    playError,
    playTurnStart
  };
})();
