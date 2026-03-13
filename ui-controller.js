/* ============================================
   IMRAN X LUDO — UI Controller
   Manages game screen UI, turns, dice, toasts
   ============================================ */

const UIController = (() => {

  let gameConfig  = null;
  let diceValue   = null;
  let movableTokens = [];
  let waitingForMove = false;
  let robotTimeout = null;

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg, duration = 2200) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    clearTimeout(toast._timer);
    toast.textContent = msg;
    toast.classList.add('show');
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ─── Update Turn Indicator ────────────────────────────────────────────────
  function updateTurnIndicator(player) {
    const dot     = document.getElementById('turn-dot');
    const name    = document.getElementById('turn-name');
    const statusEl = document.getElementById('turn-status');
    if (!dot || !name) return;

    const c = GameEngine.PLAYER_COLORS[player.color];
    dot.style.background   = c.bg;
    dot.style.boxShadow    = `0 0 8px ${c.bg}`;
    name.textContent       = player.isRobot ? `🤖 ${c.name}` : c.name;
    name.style.color       = c.bg;

    if (statusEl) {
      statusEl.textContent = player.isRobot ? 'Robot thinking...' : 'Your turn';
    }
  }

  // ─── Update Dice Button ───────────────────────────────────────────────────
  function setDiceEnabled(enabled) {
    const diceFace = document.getElementById('dice-face');
    if (!diceFace) return;
    if (enabled) {
      diceFace.classList.remove('disabled');
    } else {
      diceFace.classList.add('disabled');
    }
  }

  function showDiceValue(val) {
    const diceFace = document.getElementById('dice-face');
    if (!diceFace) return;
    const nums = ['', '1', '2', '3', '4', '5', '6'];
    diceFace.textContent = nums[val] || '?';
    // Color based on value
    if (val === 6) {
      diceFace.style.color = '#FFD700';
      diceFace.style.borderColor = '#FFD700';
    } else if (val >= 4) {
      diceFace.style.color = '#FF9500';
      diceFace.style.borderColor = '#FF9500';
    } else {
      diceFace.style.color = '#9B30FF';
      diceFace.style.borderColor = '#9B30FF';
    }
  }

  // ─── Update Player Info Panel ─────────────────────────────────────────────
  function updatePlayerPanels() {
    const state = GameEngine.getState();
    if (!state) return;

    const container = document.getElementById('player-panels');
    if (!container) return;

    container.innerHTML = '';
    state.players.forEach((player, idx) => {
      const c = GameEngine.PLAYER_COLORS[player.color];
      const wonCount = GameEngine.getWonTokenCount(player.color);
      const isActive = idx === state.currentPlayerIndex;

      const panel = document.createElement('div');
      panel.style.cssText = `
        display: flex; align-items: center; gap: 8px; padding: 8px 10px;
        border-radius: 10px; background: ${isActive ? c.bg + '20' : 'rgba(255,255,255,0.04)'};
        border: 1px solid ${isActive ? c.bg + '60' : 'rgba(255,255,255,0.08)'};
        transition: all 0.3s ease;
      `;

      panel.innerHTML = `
        <div style="width:12px;height:12px;border-radius:50%;background:${c.bg};flex-shrink:0;${isActive ? `box-shadow:0 0 8px ${c.bg}` : ''}"></div>
        <span style="font-family:'Rajdhani',sans-serif;font-size:0.85rem;font-weight:600;color:${isActive ? c.bg : 'rgba(240,230,255,0.6)'};flex:1;">${player.isRobot ? '🤖 ' : ''}${c.name}</span>
        <span style="font-family:'Orbitron',monospace;font-size:0.75rem;color:${c.bg};">${wonCount}/4 🏠</span>
      `;

      container.appendChild(panel);
    });
  }

  // ─── Handle Robot Turn ────────────────────────────────────────────────────
  function handleRobotTurn(player) {
    clearTimeout(robotTimeout);
    setDiceEnabled(false);

    const delay = 800 + Math.random() * 700;
    robotTimeout = setTimeout(() => {
      // Roll dice
      const gameConf = loadGameConfig();
      const state    = GameEngine.getState();

      let rollValue;
      if (gameConf && gameConf.mode === 'xmode') {
        rollValue = XModeEngine.getDiceForPlayer({
          playerColor: player.color,
          preferredColors: gameConf.xModeConfig.preferredColors || [],
          difficulty: gameConf.xModeConfig.difficulty || 'medium',
          customValues: {}
        });
      } else {
        rollValue = DiceSystem.fairRoll();
      }

      DiceSystem.animateDice(document.getElementById('dice-face'), rollValue, (val) => {
        showDiceValue(val);
        diceValue = val;

        const movable = GameEngine.getMovableTokens(player.color, val);

        setTimeout(() => {
          if (movable.length === 0) {
            showToast(`${GameEngine.PLAYER_COLORS[player.color].name} can't move!`);
            GameEngine.nextTurn(false, false);
            startNextTurn();
            return;
          }

          // Robot decides which token
          const allTokens = {};
          state.players.forEach(p => { allTokens[p.color] = p.tokens; });
          const chosenIdx = RobotAI.decide({
            tokens: player.tokens,
            diceValue: val,
            playerColor: player.color,
            allTokens,
            difficulty: player.difficulty || 'easy'
          });

          if (chosenIdx === null) {
            showToast(`${GameEngine.PLAYER_COLORS[player.color].name} skips!`);
            GameEngine.nextTurn(false, false);
            startNextTurn();
            return;
          }

          // Move after brief pause
          setTimeout(() => {
            const result = GameEngine.moveToken(player.color, chosenIdx, val);
            GameEngine.drawBoard();
            updatePlayerPanels();

            if (result.won) {
              const won = GameEngine.getState().players.find(p => p.color === player.color)
                .tokens.every(t => t.pos === 57);
              if (won) {
                triggerWin(player.color);
                return;
              }
            }

            if (result.captured) {
              showToast(`🔥 ${GameEngine.PLAYER_COLORS[player.color].name} captured ${GameEngine.PLAYER_COLORS[result.capturedColor].name}! Extra turn!`);
            } else if (val === 6) {
              showToast(`🎲 ${GameEngine.PLAYER_COLORS[player.color].name} rolled 6! Extra turn!`);
            }

            GameEngine.nextTurn(val === 6, result.captured);
            startNextTurn();
          }, 600);
        }, 500);
      });
    }, delay);
  }

  // ─── Start Next Turn ──────────────────────────────────────────────────────
  function startNextTurn() {
    const state   = GameEngine.getState();
    if (!state || state.gamePhase === 'gameover') return;

    const player = GameEngine.getCurrentPlayer();
    if (!player) return;

    updateTurnIndicator(player);
    updatePlayerPanels();
    diceValue = null;
    movableTokens = [];
    waitingForMove = false;
    setDiceEnabled(true);

    if (player.isRobot) {
      handleRobotTurn(player);
    }
  }

  // ─── Player Rolls Dice ────────────────────────────────────────────────────
  function handleDiceRoll() {
    const state = GameEngine.getState();
    if (!state || state.gamePhase === 'gameover') return;
    if (waitingForMove) return;

    const player = GameEngine.getCurrentPlayer();
    if (!player || player.isRobot) return;
    if (DiceSystem.getIsAnimating()) return;

    setDiceEnabled(false);
    SoundSystem.playButtonClick();

    const gameConf = loadGameConfig();
    let rollValue;

    // Custom dice override for X Mode Easy
    const customDiceEl = document.getElementById('custom-dice-selected');
    const customVal = customDiceEl ? parseInt(customDiceEl.dataset.value) : null;

    if (gameConf && gameConf.mode === 'xmode') {
      const xConfig = gameConf.xModeConfig || {};
      const customValues = customVal ? { [player.color]: customVal } : (xConfig.customValues || {});
      rollValue = XModeEngine.getDiceForPlayer({
        playerColor: player.color,
        preferredColors: xConfig.preferredColors || [],
        difficulty: xConfig.difficulty || 'medium',
        customValues
      });
    } else {
      rollValue = DiceSystem.fairRoll();
    }

    DiceSystem.animateDice(document.getElementById('dice-face'), rollValue, (val) => {
      showDiceValue(val);
      diceValue = val;

      const movable = GameEngine.getMovableTokens(player.color, val);
      movableTokens = movable;

      if (movable.length === 0) {
        showToast(`No moves available! Turn passes.`);
        setTimeout(() => {
          GameEngine.nextTurn(false, false);
          startNextTurn();
        }, 1200);
        return;
      }

      // Auto-move if only 1 option
      if (movable.length === 1) {
        waitingForMove = false;
        const result = GameEngine.moveToken(player.color, movable[0], val);
        GameEngine.drawBoard();
        updatePlayerPanels();

        if (result.won) {
          const allWon = state.players.find(p => p.color === player.color).tokens.every(t => t.pos === 57);
          if (allWon) { triggerWin(player.color); return; }
        }

        handleMoveResult(result, val, player);
        return;
      }

      // Multiple choices - highlight and wait
      waitingForMove = true;
      movable.forEach(idx => GameEngine.drawHighlight(player.color, idx));
      showToast('Tap a token to move it');
      setDiceEnabled(false);
    });
  }

  // ─── Canvas Tap Handler ───────────────────────────────────────────────────
  function handleCanvasTap(evt) {
    const state = GameEngine.getState();
    if (!state || !waitingForMove) return;

    const player = GameEngine.getCurrentPlayer();
    if (!player || player.isRobot) return;

    GameEngine.handleCanvasClick(evt, ({ row, col }) => {
      const tokenIdx = GameEngine.findClickedToken(row, col, player.color, movableTokens);
      if (tokenIdx === -1) return;

      waitingForMove = false;
      const result = GameEngine.moveToken(player.color, tokenIdx, diceValue);
      GameEngine.drawBoard();
      updatePlayerPanels();

      if (result.won) {
        const allWon = state.players.find(p => p.color === player.color).tokens.every(t => t.pos === 57);
        if (allWon) { triggerWin(player.color); return; }
      }

      handleMoveResult(result, diceValue, player);
    });
  }

  function handleMoveResult(result, val, player) {
    if (result.captured) {
      showToast(`💥 Captured ${GameEngine.PLAYER_COLORS[result.capturedColor].name}! Extra turn!`);
      GameEngine.nextTurn(val === 6, true);
    } else if (val === 6) {
      showToast('🎲 Rolled 6! Extra turn!');
      GameEngine.nextTurn(true, false);
    } else {
      GameEngine.nextTurn(false, false);
    }
    startNextTurn();
  }

  // ─── Trigger Win Screen ───────────────────────────────────────────────────
  function triggerWin(winnerColor) {
    GameEngine.saveState();
    const c = GameEngine.PLAYER_COLORS[winnerColor];
    localStorage.setItem('imranXLudoWinner', JSON.stringify({ color: winnerColor, name: c.name }));
    setTimeout(() => {
      window.location.href = 'win.html';
    }, 800);
  }

  // ─── Load Game Config ─────────────────────────────────────────────────────
  function loadGameConfig() {
    try {
      return JSON.parse(localStorage.getItem('imranXLudoConfig') || 'null');
    } catch(e) { return null; }
  }

  // ─── Init Game Screen ─────────────────────────────────────────────────────
  function initGameScreen() {
    AUTH.requireAuth();

    const config = loadGameConfig();
    if (!config) {
      window.location.href = 'menu.html';
      return;
    }

    gameConfig = config;

    // Init canvas
    const canvas = document.getElementById('ludoCanvas');
    if (canvas) {
      GameEngine.initCanvas(canvas);
      canvas.addEventListener('click', handleCanvasTap);
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleCanvasTap(e);
      }, { passive: false });
    }

    // Init game engine
    GameEngine.initGame(config);
    GameEngine.drawBoard();

    // Dice click
    const diceFace = document.getElementById('dice-face');
    if (diceFace) {
      diceFace.addEventListener('click', handleDiceRoll);
      diceFace.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleDiceRoll();
      }, { passive: false });
    }

    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (confirm('Quit game and return to menu?')) {
          GameEngine.clearState();
          window.location.href = 'menu.html';
        }
      });
    }

    // Sound toggle
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
      soundBtn.textContent = SoundSystem.isEnabled() ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        const newState = !SoundSystem.isEnabled();
        SoundSystem.setEnabled(newState);
        soundBtn.textContent = newState ? '🔊' : '🔇';
        soundBtn.classList.toggle('active', newState);
      });
    }

    // Show ads
    AdsSystem.showBannerAd('game-ad-banner');
    AdsSystem.showPopunderIfNeeded();

    // Start game
    updatePlayerPanels();
    startNextTurn();

    // Show X Mode indicator
    if (config.mode === 'xmode') {
      const badge = document.getElementById('xmode-badge');
      if (badge) {
        badge.classList.remove('hidden');
        badge.classList.add('xmode-pulse');
      }
    }

    // Custom dice for X Mode Easy
    if (config.mode === 'xmode' && config.xModeConfig && config.xModeConfig.difficulty === 'easy') {
      const customDiceArea = document.getElementById('custom-dice-area');
      if (customDiceArea) {
        customDiceArea.classList.remove('hidden');
        initCustomDice(customDiceArea, config);
      }
    }
  }

  function initCustomDice(container, config) {
    const isPreferred = (color) => (config.xModeConfig.preferredColors || []).includes(color);

    // Only show for preferred color player
    const currentPlayer = GameEngine.getCurrentPlayer();
    if (!currentPlayer) return;

    container.innerHTML = `
      <div class="section-label" style="margin-bottom:8px;">🎯 X Control <span style="color:var(--pink);font-size:0.65rem;margin-left:4px;">(Sets next dice)</span></div>
      <div class="custom-dice-grid" id="custom-dice-grid">
        ${[1,2,3,4,5,6].map(n => `
          <button class="custom-dice-btn" data-num="${n}" onclick="selectCustomDice(${n})">${n}</button>
        `).join('')}
      </div>
      <div id="custom-dice-selected" data-value="" style="display:none;"></div>
    `;
  }

  return {
    initGameScreen,
    startNextTurn,
    handleDiceRoll,
    handleCanvasTap,
    showToast,
    updateTurnIndicator,
    updatePlayerPanels,
    loadGameConfig
  };
})();

// Global custom dice selector (called from HTML)
function selectCustomDice(num) {
  const selected = document.getElementById('custom-dice-selected');
  const btns = document.querySelectorAll('.custom-dice-btn');
  btns.forEach(b => b.classList.remove('selected'));
  const activeBtn = document.querySelector(`.custom-dice-btn[data-num="${num}"]`);
  if (activeBtn) {
    activeBtn.classList.add('selected', 'number-select');
    setTimeout(() => activeBtn.classList.remove('number-select'), 250);
  }
  if (selected) {
    // Toggle off if same number
    if (selected.dataset.value === String(num)) {
      selected.dataset.value = '';
      if (activeBtn) activeBtn.classList.remove('selected');
    } else {
      selected.dataset.value = String(num);
    }
  }
  SoundSystem.playButtonClick();
}
