/* ============================================
   IMRAN X LUDO — Robot AI
   Easy / Medium / Hard difficulty
   ============================================ */

const RobotAI = (() => {

  // ─── Easy AI: Completely random token choice ──────────────────────────────
  function easyMove(tokens, diceValue, playerColor, allTokens) {
    const movable = getMovableTokens(tokens, diceValue);
    if (movable.length === 0) return null;
    // Pick completely at random
    return movable[Math.floor(Math.random() * movable.length)];
  }

  // ─── Medium AI: Prefers captures, then progress ───────────────────────────
  function mediumMove(tokens, diceValue, playerColor, allTokens) {
    const movable = getMovableTokens(tokens, diceValue);
    if (movable.length === 0) return null;

    // Priority:
    // 1. Can capture an opponent? Do it
    // 2. Can enter home? Do it
    // 3. Move farthest token
    // 4. Enter board if possible

    const captureMove = findCaptureMove(movable, tokens, diceValue, playerColor, allTokens);
    if (captureMove !== null) return captureMove;

    // Enter home
    const homeMove = findHomeMoveToken(movable, tokens, diceValue);
    if (homeMove !== null) return homeMove;

    // Move farthest token (not in safe zone)
    const farthest = getFarthestToken(movable, tokens);
    if (farthest !== null) return farthest;

    // Random
    return movable[Math.floor(Math.random() * movable.length)];
  }

  // ─── Hard AI: Optimized strategy ─────────────────────────────────────────
  function hardMove(tokens, diceValue, playerColor, allTokens) {
    const movable = getMovableTokens(tokens, diceValue);
    if (movable.length === 0) return null;

    // Strategy:
    // 1. Win if possible (complete journey)
    // 2. Capture opponent
    // 3. Enter home stretch
    // 4. Move token to safe cell
    // 5. Enter board (roll 6 to exit home)
    // 6. Move farthest token

    // Win
    const winMove = findWinMove(movable, tokens, diceValue);
    if (winMove !== null) return winMove;

    // Capture
    const captureMove = findCaptureMove(movable, tokens, diceValue, playerColor, allTokens);
    if (captureMove !== null) return captureMove;

    // Home stretch entry
    const homeMove = findHomeMoveToken(movable, tokens, diceValue);
    if (homeMove !== null) return homeMove;

    // Move to safe cell
    const safeMove = findSafeMove(movable, tokens, diceValue);
    if (safeMove !== null) return safeMove;

    // Enter board (new token)
    const enterMove = findEnterMove(movable, tokens, diceValue);
    if (enterMove !== null) return enterMove;

    // Farthest token
    const farthest = getFarthestToken(movable, tokens);
    if (farthest !== null) return farthest;

    return movable[0];
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getMovableTokens(tokens, diceValue) {
    return tokens
      .map((t, i) => ({ token: t, index: i }))
      .filter(({ token }) => canMove(token, diceValue))
      .map(({ index }) => index);
  }

  function canMove(token, diceValue) {
    if (token.pos === 58) return false; // already won
    if (token.pos === -1) return diceValue === 6; // need 6 to exit home
    const newPos = token.pos + diceValue;
    if (newPos > 57) return false; // overshoot (need exact)
    return true;
  }

  function findCaptureMove(movable, tokens, diceValue, playerColor, allTokens) {
    const PLAYER_OFFSETS = { red: 0, blue: 13, yellow: 26, green: 39 };
    const SAFE_GLOBAL = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
    const offset = PLAYER_OFFSETS[playerColor];

    for (const idx of movable) {
      const token = tokens[idx];
      if (token.pos === -1 || token.pos > 51) continue; // can't capture from home base or home col

      const newPos = token.pos + diceValue;
      if (newPos > 51) continue; // entering home column — no capture possible

      const globalPos = (newPos + offset) % 52;
      if (SAFE_GLOBAL.has(globalPos)) continue; // safe cell

      // Check if any opponent is on this global position
      for (const [color, opTokens] of Object.entries(allTokens)) {
        if (color === playerColor) continue;
        const oppOffset = PLAYER_OFFSETS[color];
        for (const opp of opTokens) {
          if (opp.pos === -1 || opp.pos > 51 || opp.pos === 58) continue;
          const oppGlobal = (opp.pos + oppOffset) % 52;
          if (oppGlobal === globalPos) return idx; // capture!
        }
      }
    }
    return null;
  }

  function findHomeMoveToken(movable, tokens, diceValue) {
    for (const idx of movable) {
      const token = tokens[idx];
      if (token.pos === -1) continue;
      const newPos = token.pos + diceValue;
      if (newPos >= 52 && newPos <= 57) return idx;
    }
    return null;
  }

  function findWinMove(movable, tokens, diceValue) {
    for (const idx of movable) {
      const token = tokens[idx];
      if (token.pos === -1) continue;
      if (token.pos + diceValue === 57) return idx;
    }
    return null;
  }

  function findSafeMove(movable, tokens, diceValue) {
    const PLAYER_OFFSETS = { red: 0, blue: 13, yellow: 26, green: 39 };
    const SAFE_RELATIVE = new Set([8, 13, 21, 26, 34, 39, 47]);

    for (const idx of movable) {
      const token = tokens[idx];
      if (token.pos === -1) continue;
      const newPos = token.pos + diceValue;
      if (SAFE_RELATIVE.has(newPos % 52)) return idx;
    }
    return null;
  }

  function findEnterMove(movable, tokens, diceValue) {
    if (diceValue !== 6) return null;
    for (const idx of movable) {
      if (tokens[idx].pos === -1) return idx;
    }
    return null;
  }

  function getFarthestToken(movable, tokens) {
    let best = -1;
    let bestPos = -2;
    for (const idx of movable) {
      const pos = tokens[idx].pos;
      if (pos > bestPos) {
        bestPos = pos;
        best = idx;
      }
    }
    return best === -1 ? null : best;
  }

  // ─── Main Decision ────────────────────────────────────────────────────────
  function decide({ tokens, diceValue, playerColor, allTokens, difficulty }) {
    switch (difficulty) {
      case 'easy':   return easyMove(tokens, diceValue, playerColor, allTokens);
      case 'medium': return mediumMove(tokens, diceValue, playerColor, allTokens);
      case 'hard':   return hardMove(tokens, diceValue, playerColor, allTokens);
      default:       return easyMove(tokens, diceValue, playerColor, allTokens);
    }
  }

  return { decide, getMovableTokens, canMove };
})();
