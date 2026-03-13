/* ============================================
   IMRAN X LUDO — Auth System
   Password protection with lockout logic
   ============================================ */

const AUTH = (() => {
  const CORRECT_PASSWORD = 'Md Imran X Ludo 123';
  const STORAGE_KEY      = 'imranXLudoAuth';
  const ATTEMPTS_KEY     = 'imranXLudoAttempts';
  const LOCKOUT_KEY      = 'imranXLudoLockout';

  // Lockout steps: after 3 wrong attempts
  const LOCKOUT_STEPS = [15, 30, 60]; // seconds

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function getAttempts() {
    return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10);
  }

  function getLockoutEnd() {
    return parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  }

  function isLockedOut() {
    const end = getLockoutEnd();
    return end > Date.now();
  }

  function remainingLockout() {
    return Math.max(0, Math.ceil((getLockoutEnd() - Date.now()) / 1000));
  }

  function getLockoutDuration(attempts) {
    // After every 3 wrong attempts, lock increases
    const idx = Math.min(Math.floor((attempts - 1) / 3), LOCKOUT_STEPS.length - 1);
    // Cycle through: 15s, 30s, 60s
    return LOCKOUT_STEPS[idx] * 1000;
  }

  function login(password) {
    if (isLockedOut()) {
      return { success: false, locked: true, remaining: remainingLockout() };
    }

    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      return { success: true };
    }

    // Wrong password
    const attempts = getAttempts() + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(attempts));

    // Apply lockout after every 3 wrong attempts
    if (attempts % 3 === 0) {
      const duration = getLockoutDuration(attempts);
      const end = Date.now() + duration;
      localStorage.setItem(LOCKOUT_KEY, String(end));
      return {
        success: false,
        locked: true,
        remaining: Math.ceil(duration / 1000),
        attemptsDone: attempts
      };
    }

    return {
      success: false,
      locked: false,
      attemptsLeft: 3 - (attempts % 3),
      totalAttempts: attempts
    };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function requireAuth(redirectTo = 'index.html') {
    if (!isAuthenticated()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  return {
    isAuthenticated,
    isLockedOut,
    remainingLockout,
    login,
    logout,
    requireAuth
  };
})();

// ─── Password Screen Controller ───────────────────────────────────────────────
function initPasswordScreen() {
  // If already authenticated, go to menu
  if (AUTH.isAuthenticated()) {
    window.location.href = 'menu.html';
    return;
  }

  const form         = document.getElementById('login-form');
  const input        = document.getElementById('password-input');
  const submitBtn    = document.getElementById('login-submit');
  const errorEl      = document.getElementById('login-error');
  const lockoutEl    = document.getElementById('lockout-banner');
  const lockoutTimer = document.getElementById('lockout-timer');
  const togglePwd    = document.getElementById('toggle-password');
  const cardEl       = document.getElementById('login-card');

  let countdownInterval = null;

  function showError(msg) {
    const textSpan = document.getElementById('login-error-text');
    if (textSpan) textSpan.textContent = msg;
    errorEl.style.display = 'flex';
    errorEl.classList.remove('hidden');
    cardEl.classList.add('shake-card');
    setTimeout(() => cardEl.classList.remove('shake-card'), 500);
    setTimeout(() => { errorEl.style.display = 'none'; errorEl.classList.add('hidden'); }, 4500);
  }

  function startLockoutCountdown(seconds) {
    lockoutEl.classList.remove('hidden');
    form.classList.add('hidden');

    function update() {
      const rem = AUTH.remainingLockout();
      if (rem <= 0) {
        clearInterval(countdownInterval);
        lockoutEl.classList.add('hidden');
        form.classList.remove('hidden');
        input.value = '';
        input.focus();
        return;
      }
      lockoutTimer.textContent = rem + 's';
      lockoutTimer.classList.add('countdown-tick');
      setTimeout(() => lockoutTimer.classList.remove('countdown-tick'), 300);
    }

    update();
    countdownInterval = setInterval(update, 1000);
  }

  // Check if already in lockout on page load
  if (AUTH.isLockedOut()) {
    startLockoutCountdown(AUTH.remainingLockout());
  }

  // Toggle password visibility
  if (togglePwd) {
    togglePwd.addEventListener('click', () => {
      const isText = input.type === 'text';
      input.type   = isText ? 'password' : 'text';
      togglePwd.textContent = isText ? '👁' : '🙈';
    });
  }

  // Submit handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', handleLogin);
  }

  // Enter key
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }

  function handleLogin() {
    const pwd = input ? input.value.trim() : '';
    if (!pwd) {
      showError('Please enter the password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    setTimeout(() => {
      const result = AUTH.login(pwd);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Enter';

      if (result.success) {
        // Animate success then redirect
        cardEl.style.transition = 'all 0.5s ease';
        cardEl.style.transform  = 'scale(1.03)';
        cardEl.style.opacity    = '0.8';
        setTimeout(() => { window.location.href = 'menu.html'; }, 500);
      } else if (result.locked) {
        const dur = result.remaining;
        startLockoutCountdown(dur);
        if (dur >= 60) {
          showError(`Too many attempts. Locked for ${dur}s.`);
        } else {
          showError(`Wrong password. Locked for ${dur} seconds.`);
        }
      } else {
        const left = result.attemptsLeft;
        if (left !== undefined) {
          showError(`Wrong password. ${left} attempt${left !== 1 ? 's' : ''} left before lockout.`);
        } else {
          showError('Wrong password. Please try again.');
        }
        input.value = '';
        input.focus();
      }
    }, 300);
  }
}
