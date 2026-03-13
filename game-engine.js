/* ============================================
   IMRAN X LUDO — Game Engine
   Core Ludo game logic + Canvas rendering
   ============================================ */

const GameEngine = (() => {

  // ─── Board Constants ──────────────────────────────────────────────────────
  const BOARD_SIZE = 15;

  // Main track: 52 cells (indices 0-51)
  const PATH = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    [0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    [7,14],[8,14],
    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6],
    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [7,0],[6,0]
  ];

  // Home columns (5 cells each, position 52-56, then win at 57)
  const HOME_COL = {
    red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
    blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
    green:  [[13,7],[12,7],[11,7],[10,7],[9,7]]
  };

  // Player offsets (index in PATH where player enters)
  const PLAYER_OFFSET = { red: 0, blue: 13, yellow: 26, green: 39 };

  // Safe cells (global PATH indices - no capture possible)
  const SAFE_GLOBAL = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

  // Home base token starting positions (relative [row, col] within 6x6 area)
  const HOME_TOKEN_SPOTS = {
    red:    [[1,1],[1,3],[3,1],[3,3]],
    blue:   [[1,10],[1,12],[3,10],[3,12]],
    yellow: [[10,10],[10,12],[12,10],[12,12]],
    green:  [[10,1],[10,3],[12,1],[12,3]]
  };

  // Colors
  const PLAYER_COLORS = {
    red:    { bg: '#FF3B3B', light: '#FF8080', dark: '#CC0000', home: '#FF2020', name: 'Red' },
    blue:   { bg: '#3B9EFF', light: '#80C4FF', dark: '#0070CC', home: '#2090FF', name: 'Blue' },
    yellow: { bg: '#FFD700', light: '#FFE878', dark: '#CC9900', home: '#FFCC00', name: 'Yellow' },
    green:  { bg: '#3BFF7A', light: '#80FFB0', dark: '#00CC44', home: '#20FF66', name: 'Green' }
  };

  const HOME_AREA = {
    red:    { rows: [0,5], cols: [0,5] },
    blue:   { rows: [0,5], cols: [9,14] },
    yellow: { rows: [9,14], cols: [9,14] },
    green:  { rows: [9,14], cols: [0,5] }
  };

  // ─── Game State ───────────────────────────────────────────────────────────
  let state = null;
  let canvas = null;
  let ctx    = null;
  let cellSize = 0;
  let animQueue = [];
  let onStateChange = null;

  // ─── Token Position to Board Coords ──────────────────────────────────────
  function getBoardCell(playerColor, tokenPos) {
    if (tokenPos === -1) return null; // in home base
    if (tokenPos === 57) return null; // won - not on board

    if (tokenPos >= 52) {
      // In home column
      const homeStep = tokenPos - 52; // 0-4
      const homeColArr = HOME_COL[playerColor];
      return homeColArr[homeStep] || null;
    }

    // On main track
    const offset = PLAYER_OFFSET[playerColor];
    const globalIdx = (tokenPos + offset) % 52;
    return PATH[globalIdx];
  }

  // ─── Get all tokens at a specific cell ───────────────────────────────────
  function getTokensAtCell(row, col) {
    const result = [];
    if (!state) return result;
    for (const player of state.players) {
      player.tokens.forEach((t, ti) => {
        if (t.pos === 57 || t.pos === -1) return;
        const cell = getBoardCell(player.color, t.pos);
        if (cell && cell[0] === row && cell[1] === col) {
          result.push({ playerColor: player.color, tokenIndex: ti, pos: t.pos });
        }
      });
    }
    return result;
  }

  // ─── Can token move ───────────────────────────────────────────────────────
  function canTokenMove(playerColor, tokenIndex, diceValue) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return false;
    const token = player.tokens[tokenIndex];
    if (!token) return false;
    if (token.pos === 57) return false;
    if (token.pos === -1) return diceValue === 6;
    const newPos = token.pos + diceValue;
    return newPos <= 57;
  }

  // ─── Get movable tokens ───────────────────────────────────────────────────
  function getMovableTokens(playerColor, diceValue) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return [];
    return player.tokens
      .map((t, i) => i)
      .filter(i => canTokenMove(playerColor, i, diceValue));
  }

  // ─── Move token ───────────────────────────────────────────────────────────
  function moveToken(playerColor, tokenIndex, diceValue) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return { moved: false };
    const token = player.tokens[tokenIndex];
    if (!token) return { moved: false };

    const oldPos = token.pos;

    // Enter board
    if (token.pos === -1 && diceValue === 6) {
      token.pos = 0;
      SoundSystem.playTokenMove();
      return { moved: true, entered: true, newPos: 0 };
    }

    const newPos = token.pos + diceValue;
    if (newPos > 57) return { moved: false, overshoot: true }; // can't move

    const oldCell = getBoardCell(playerColor, token.pos);
    token.pos = newPos;
    const newCell = getBoardCell(playerColor, newPos);

    let captured = false;
    let capturedColor = null;

    // Check win
    if (newPos === 57) {
      token.pos = 57;
      SoundSystem.playTokenHome();
      checkWin(playerColor);
      return { moved: true, won: true, newPos };
    }

    // Check capture (only on main track, not home column, not safe cells)
    if (newPos <= 51 && newCell) {
      const offset = PLAYER_OFFSET[playerColor];
      const globalIdx = (newPos + offset) % 52;

      if (!SAFE_GLOBAL.has(globalIdx)) {
        // Check all other players on this cell
        for (const other of state.players) {
          if (other.color === playerColor) continue;
          const otherOffset = PLAYER_OFFSET[other.color];
          other.tokens.forEach(ot => {
            if (ot.pos === -1 || ot.pos > 51 || ot.pos === 57) return;
            const otherGlobal = (ot.pos + otherOffset) % 52;
            if (otherGlobal === globalIdx) {
              // Capture!
              ot.pos = -1; // send home
              captured = true;
              capturedColor = other.color;
              SoundSystem.playTokenCapture();
            }
          });
        }
      }
    }

    if (!captured) SoundSystem.playTokenMove();

    return { moved: true, newPos, captured, capturedColor };
  }

  // ─── Check win ────────────────────────────────────────────────────────────
  function checkWin(playerColor) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return false;
    const won = player.tokens.every(t => t.pos === 57);
    if (won) {
      state.gamePhase = 'gameover';
      state.winner = playerColor;
      SoundSystem.playWin();
      if (onStateChange) onStateChange('win', { winner: playerColor });
    }
    return won;
  }

  // ─── Get token count at home (won) ────────────────────────────────────────
  function getWonTokenCount(playerColor) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return 0;
    return player.tokens.filter(t => t.pos === 57).length;
  }

  // ─── Next player turn ─────────────────────────────────────────────────────
  function nextTurn(rolledSix, captured) {
    // Extra turn for rolling 6 or capturing
    if (rolledSix || captured) {
      state.extraTurn = true;
      return;
    }
    state.extraTurn = false;
    state.consecutiveSixes = 0;

    const activePlayers = state.players.filter(p => !isPlayerDone(p.color));
    if (activePlayers.length <= 1) return;

    do {
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    } while (isPlayerDone(state.players[state.currentPlayerIndex].color));

    state.phase = 'roll';
    state.lastDice = null;

    SoundSystem.playTurnStart();
    if (onStateChange) onStateChange('turn', { player: state.players[state.currentPlayerIndex] });
  }

  function isPlayerDone(playerColor) {
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return true;
    return player.tokens.every(t => t.pos === 57);
  }

  // ─── Initialize Game ──────────────────────────────────────────────────────
  function initGame(config) {
    const { players, mode, xModeConfig } = config;

    state = {
      players: players.map(p => ({
        color: p.color,
        name: p.name || PLAYER_COLORS[p.color].name,
        isRobot: p.isRobot || false,
        difficulty: p.difficulty || 'easy',
        tokens: [
          { pos: -1 },
          { pos: -1 },
          { pos: -1 },
          { pos: -1 }
        ]
      })),
      currentPlayerIndex: 0,
      phase: 'roll',        // 'roll' | 'move' | 'gameover'
      lastDice: null,
      extraTurn: false,
      consecutiveSixes: 0,
      winner: null,
      gamePhase: 'active',
      mode,
      xModeConfig: xModeConfig || null
    };

    if (onStateChange) onStateChange('init', { state });
    return state;
  }

  // ─── Canvas Drawing ───────────────────────────────────────────────────────

  function initCanvas(canvasEl) {
    canvas = canvasEl;
    ctx    = canvasEl.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const size = Math.min(wrap.clientWidth, wrap.clientHeight);
    canvas.width  = size;
    canvas.height = size;
    cellSize = size / BOARD_SIZE;
    if (state) drawBoard();
  }

  function drawBoard() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all cells
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        drawCell(r, c);
      }
    }

    // Draw center arrows/home triangles
    drawCenter();

    // Draw tokens
    if (state) {
      state.players.forEach(player => {
        player.tokens.forEach((token, i) => {
          drawToken(player.color, i, token);
        });
      });
    }
  }

  function cx(col)  { return col * cellSize; }
  function cy(row)  { return row * cellSize; }
  function cs()     { return cellSize; }

  function drawCell(row, col) {
    const x = cx(col);
    const y = cy(row);
    const s = cs();

    let fillColor = '#F5F0FF';

    // Home areas
    const homeKey = getHomeArea(row, col);
    if (homeKey) {
      const c = PLAYER_COLORS[homeKey];
      // Inner yard (tokens starting area) is lighter
      const isInnerYard = isInHomeYard(row, col, homeKey);
      fillColor = isInnerYard ? c.light + '55' : c.bg + '33';
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, s, s);
      // Border
      ctx.strokeStyle = c.bg + '88';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

      // Draw inner yard background
      if (isInnerYard) {
        ctx.fillStyle = c.light + '22';
        ctx.fillRect(x, y, s, s);
      }
      return;
    }

    // Home columns
    const homeColColor = getHomeColColor(row, col);
    if (homeColColor) {
      const c = PLAYER_COLORS[homeColColor];
      ctx.fillStyle = c.light + '55';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = c.bg + '66';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      return;
    }

    // Center cell
    if (row === 7 && col === 7) return; // drawn separately

    // Safe cells (star cells)
    const isSafe = isSafeCell(row, col);
    if (isSafe) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, s, s);
      // Draw star
      ctx.fillStyle = getSafeCellColor(row, col);
      drawStar(ctx, x + s/2, y + s/2, s * 0.35, 5);
      ctx.strokeStyle = '#CCC';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      return;
    }

    // Regular path cells
    if (isPathCell(row, col)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      return;
    }

    // Background for non-path cells inside cross area
    ctx.fillStyle = '#1A0A35';
    ctx.fillRect(x, y, s, s);
  }

  function drawCenter() {
    // Draw the 3x3 center with color triangles
    const colors = ['red','blue','yellow','green'];
    const triangleData = [
      // top (blue)
      { color: 'blue',   points: [[cx(6),cy(6)],[cx(9),cy(6)],[cx(7.5),cy(7.5)]] },
      // right (yellow)
      { color: 'yellow', points: [[cx(9),cy(6)],[cx(9),cy(9)],[cx(7.5),cy(7.5)]] },
      // bottom (green)
      { color: 'green',  points: [[cx(6),cy(9)],[cx(9),cy(9)],[cx(7.5),cy(7.5)]] },
      // left (red)
      { color: 'red',    points: [[cx(6),cy(6)],[cx(6),cy(9)],[cx(7.5),cy(7.5)]] },
    ];

    triangleData.forEach(({ color, points }) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.closePath();
      ctx.fillStyle = PLAYER_COLORS[color].bg;
      ctx.fill();
    });

    // Center white circle
    ctx.beginPath();
    ctx.arc(cx(7.5), cy(7.5), cellSize * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Star in center
    ctx.fillStyle = '#FFD700';
    drawStar(ctx, cx(7.5), cy(7.5), cellSize * 0.55, 6);
  }

  function drawToken(playerColor, tokenIndex, token) {
    if (token.pos === 57) return; // won, shown in home base overlay

    const c = PLAYER_COLORS[playerColor];

    if (token.pos === -1) {
      // Draw in home base
      const spots = HOME_TOKEN_SPOTS[playerColor];
      if (!spots || !spots[tokenIndex]) return;
      const [row, col] = spots[tokenIndex];
      drawTokenCircle(cx(col) + cs()/2, cy(row) + cs()/2, cs() * 0.35, c, tokenIndex, token.pos);
      return;
    }

    const cell = getBoardCell(playerColor, token.pos);
    if (!cell) return;
    const [row, col] = cell;

    // Count tokens on this cell to offset stacking
    const cellTokens = getTokensAtCell(row, col);
    const myIdx = cellTokens.findIndex(t => t.playerColor === playerColor && t.tokenIndex === tokenIndex);
    const total = cellTokens.length;

    let offsetX = 0, offsetY = 0;
    if (total > 1) {
      const angle = (myIdx / total) * Math.PI * 2 - Math.PI / 2;
      const radius = cs() * 0.22;
      offsetX = Math.cos(angle) * radius;
      offsetY = Math.sin(angle) * radius;
    }

    const baseX = cx(col) + cs()/2 + offsetX;
    const baseY = cy(row) + cs()/2 + offsetY;
    const radius = total > 1 ? cs() * 0.28 : cs() * 0.33;

    drawTokenCircle(baseX, baseY, radius, c, tokenIndex, token.pos);
  }

  function drawTokenCircle(x, y, r, colorObj, tokenIndex, pos) {
    // Shadow
    ctx.shadowColor = colorObj.bg;
    ctx.shadowBlur  = 8;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = colorObj.bg + '44';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Main token body
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    grad.addColorStop(0, colorObj.light);
    grad.addColorStop(0.7, colorObj.bg);
    grad.addColorStop(1, colorObj.dark);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner circle
    ctx.beginPath();
    ctx.arc(x - r*0.2, y - r*0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Token number
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = `bold ${Math.floor(r * 0.9)}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tokenIndex + 1, x, y + 1);

    // Won checkmark
    if (pos === 57) {
      ctx.fillStyle = '#FFD700';
      ctx.font = `${Math.floor(r * 0.8)}px sans-serif`;
      ctx.fillText('✓', x, y);
    }

    ctx.shadowBlur = 0;
  }

  function drawHighlight(playerColor, tokenIndex) {
    if (!state || !ctx) return;
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return;
    const token = player.tokens[tokenIndex];
    if (!token) return;

    if (token.pos === -1) {
      const spots = HOME_TOKEN_SPOTS[playerColor];
      if (!spots || !spots[tokenIndex]) return;
      const [row, col] = spots[tokenIndex];
      highlightCircle(cx(col) + cs()/2, cy(row) + cs()/2, cs() * 0.45);
      return;
    }

    const cell = getBoardCell(playerColor, token.pos);
    if (!cell) return;
    const [row, col] = cell;
    highlightCircle(cx(col) + cs()/2, cy(row) + cs()/2, cs() * 0.45);
  }

  function highlightCircle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,0,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // ─── Helper draw functions ────────────────────────────────────────────────
  function drawStar(ctx, cx, cy, r, points) {
    const outer = r;
    const inner = r * 0.42;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle  = (i * Math.PI / points) - Math.PI / 2;
      const radius = i % 2 === 0 ? outer : inner;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function getHomeArea(row, col) {
    if (row <= 5 && col <= 5) return 'red';
    if (row <= 5 && col >= 9) return 'blue';
    if (row >= 9 && col >= 9) return 'yellow';
    if (row >= 9 && col <= 5) return 'green';
    return null;
  }

  function isInHomeYard(row, col, color) {
    const areas = { red: [[1,4],[1,4]], blue: [[1,4],[10,13]], yellow: [[10,13],[10,13]], green: [[10,13],[1,4]] };
    const [rows, cols] = areas[color];
    return row >= rows[0] && row <= rows[1] && col >= cols[0] && col <= cols[1];
  }

  function getHomeColColor(row, col) {
    if (row === 7 && col >= 1 && col <= 5) return 'red';
    if (col === 7 && row >= 1 && row <= 5) return 'blue';
    if (row === 7 && col >= 9 && col <= 13) return 'yellow';
    if (col === 7 && row >= 9 && row <= 13) return 'green';
    return null;
  }

  function isPathCell(row, col) {
    // Check if cell is in PATH array
    return PATH.some(([r, c]) => r === row && c === col);
  }

  function isSafeCell(row, col) {
    for (const gi of SAFE_GLOBAL) {
      const [r, c] = PATH[gi];
      if (r === row && c === col) return true;
    }
    return false;
  }

  function getSafeCellColor(row, col) {
    // Return color based on which side of the board it's on
    if (row < 7) return '#3B9EFF44';
    if (row > 7) return '#3BFF7A44';
    if (col < 7) return '#FF3B3B44';
    return '#FFD70044';
  }

  // ─── Handle canvas click/tap ──────────────────────────────────────────────
  function handleCanvasClick(evt, callback) {
    if (!canvas || !state) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (evt.touches) {
      clientX = evt.touches[0].clientX;
      clientY = evt.touches[0].clientY;
    } else {
      clientX = evt.clientX;
      clientY = evt.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top)  * scaleY;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    callback({ row, col });
  }

  // ─── Find which token was clicked ─────────────────────────────────────────
  function findClickedToken(row, col, playerColor, movableTokens) {
    if (!state) return -1;
    const player = state.players.find(p => p.color === playerColor);
    if (!player) return -1;

    for (const idx of movableTokens) {
      const token = player.tokens[idx];
      if (token.pos === -1) {
        // Check home base spots
        const spots = HOME_TOKEN_SPOTS[playerColor];
        if (spots && spots[idx]) {
          const [tr, tc] = spots[idx];
          if (tr === row && tc === col) return idx;
        }
      } else {
        const cell = getBoardCell(playerColor, token.pos);
        if (cell && cell[0] === row && cell[1] === col) return idx;
      }
    }
    return -1;
  }

  // ─── Public State Getters ─────────────────────────────────────────────────
  function getState() { return state; }

  function getCurrentPlayer() {
    if (!state) return null;
    return state.players[state.currentPlayerIndex];
  }

  function setStateChangeCallback(fn) {
    onStateChange = fn;
  }

  function saveState() {
    if (state) {
      localStorage.setItem('imranXLudoGameState', JSON.stringify(state));
    }
  }

  function loadState() {
    const saved = localStorage.getItem('imranXLudoGameState');
    if (saved) {
      try {
        state = JSON.parse(saved);
        return true;
      } catch(e) {}
    }
    return false;
  }

  function clearState() {
    localStorage.removeItem('imranXLudoGameState');
    state = null;
  }

  return {
    PATH,
    HOME_COL,
    PLAYER_OFFSET,
    PLAYER_COLORS,
    HOME_TOKEN_SPOTS,
    initGame,
    initCanvas,
    drawBoard,
    drawHighlight,
    resizeCanvas,
    getBoardCell,
    getMovableTokens,
    canTokenMove,
    moveToken,
    nextTurn,
    isPlayerDone,
    getWonTokenCount,
    handleCanvasClick,
    findClickedToken,
    getState,
    getCurrentPlayer,
    setStateChangeCallback,
    saveState,
    loadState,
    clearState
  };
})();
