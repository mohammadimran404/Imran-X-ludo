/* ============================================
   IMRAN X LUDO — X Mode Engine
   Prank dice manipulation (never call it cheat)
   ============================================ */

const XModeEngine = (() => {

  // ─── Weighted Random Dice ─────────────────────────────────────────────────
  function weightedRandom(weights) {
    // weights: array of 6 numbers (for faces 1–6), sum doesn't need to be 1
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < 6; i++) {
      r -= weights[i];
      if (r <= 0) return i + 1;
    }
    return 6;
  }

  function fairRoll() {
    return Math.floor(Math.random() * 6) + 1;
  }

  // ─── Easy Mode Dice ──────────────────────────────────────────────────────
  // Preferred color: mostly 5 or 6
  // Others: mostly 1,2,3,4 with rare 5,6
  function easyRoll(isPreferred) {
    if (isPreferred) {
      // Weights heavily toward 5,6
      return weightedRandom([2, 2, 3, 5, 18, 20]);
    } else {
      // Weights toward 1,2,3,4 with very rare 5,6
      return weightedRandom([20, 18, 15, 10, 3, 2]);
    }
  }

  // ─── Medium Mode Dice ─────────────────────────────────────────────────────
  // Preferred color: frequently 4,5,6
  // Others: completely fair
  function mediumRoll(isPreferred) {
    if (isPreferred) {
      // Slightly weighted toward high numbers
      return weightedRandom([5, 5, 8, 14, 16, 16]);
    } else {
      // Fair roll
      return fairRoll();
    }
  }

  // ─── Hard Mode Dice ───────────────────────────────────────────────────────
  // No manipulation — completely fair for all
  function hardRoll() {
    return fairRoll();
  }

  // ─── Custom Dice ──────────────────────────────────────────────────────────
  // User picks a number; dice mostly gives that number with slight variance
  function customRoll(preferredValue) {
    // 75% chance of exact value, 25% chance of ±1
    const r = Math.random();
    if (r < 0.75) return preferredValue;
    const offset = Math.random() < 0.5 ? 1 : -1;
    const result = preferredValue + offset;
    if (result < 1) return 1;
    if (result > 6) return 6;
    return result;
  }

  // ─── Main Roll Function ───────────────────────────────────────────────────
  function roll({ difficulty, isPreferredColor, customValue = null }) {
    // If custom value is set (Easy mode custom control), use it
    if (customValue !== null && customValue >= 1 && customValue <= 6) {
      return customRoll(customValue);
    }

    switch (difficulty) {
      case 'easy':   return easyRoll(isPreferredColor);
      case 'medium': return mediumRoll(isPreferredColor);
      case 'hard':   return hardRoll();
      default:       return fairRoll();
    }
  }

  // ─── Get Dice Value for Player ────────────────────────────────────────────
  function getDiceForPlayer({ playerColor, preferredColors, difficulty, customValues }) {
    const isPreferred = preferredColors.includes(playerColor);
    const customValue = (customValues && customValues[playerColor]) || null;

    return roll({
      difficulty,
      isPreferredColor: isPreferred,
      customValue: isPreferred ? customValue : null
    });
  }

  return {
    roll,
    fairRoll,
    getDiceForPlayer
  };
})();
