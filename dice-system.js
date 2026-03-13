/* ============================================
   IMRAN X LUDO — Dice System
   Handles dice rolling logic (fair + X Mode)
   ============================================ */

const DiceSystem = (() => {
  const DICE_EMOJIS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const DICE_DOTS   = ['', '1', '2', '3', '4', '5', '6'];

  let isAnimating = false;

  // ─── Fair Roll ────────────────────────────────────────────────────────────
  function fairRoll() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // ─── Get roll for current player ─────────────────────────────────────────
  function getRoll(gameConfig) {
    const { mode, xModeConfig, currentPlayerColor } = gameConfig;

    if (mode === 'xmode' && xModeConfig) {
      return XModeEngine.getDiceForPlayer({
        playerColor: currentPlayerColor,
        preferredColors: xModeConfig.preferredColors || [],
        difficulty: xModeConfig.difficulty || 'medium',
        customValues: xModeConfig.customValues || {}
      });
    }

    return fairRoll();
  }

  // ─── Animate Dice ─────────────────────────────────────────────────────────
  function animateDice(element, finalValue, callback) {
    if (!element) { if (callback) callback(finalValue); return; }

    isAnimating = true;
    element.classList.add('rolling');
    element.classList.remove('dice-reveal');

    SoundSystem.playDiceRoll();

    let count = 0;
    const maxFlash = 10;
    const interval = setInterval(() => {
      const rand = Math.floor(Math.random() * 6) + 1;
      element.textContent = DICE_DOTS[rand];
      count++;

      if (count >= maxFlash) {
        clearInterval(interval);
        element.textContent = DICE_DOTS[finalValue];
        element.classList.remove('rolling');
        element.classList.add('dice-reveal');

        setTimeout(() => {
          element.classList.remove('dice-reveal');
          isAnimating = false;
          SoundSystem.playDiceResult(finalValue);
          if (finalValue === 6) SoundSystem.playSixRoll();
          if (callback) callback(finalValue);
        }, 300);
      }
    }, 60);
  }

  // ─── Get emoji for value ─────────────────────────────────────────────────
  function getEmoji(value) {
    return DICE_EMOJIS[value] || '?';
  }

  function getIsAnimating() {
    return isAnimating;
  }

  return {
    fairRoll,
    getRoll,
    animateDice,
    getEmoji,
    getIsAnimating
  };
})();
