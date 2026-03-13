/* ============================================
   IMRAN X LUDO — Ads System
   Banner + Popunder ad placeholders
   ============================================ */

const AdsSystem = (() => {
  const POPUNDER_KEY = 'imranXLudoPopunderShown';

  // ─── Banner Ad ────────────────────────────────────────────────────────────
  function showBannerAd(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="ad-banner" style="
        background: linear-gradient(135deg, rgba(255,215,0,0.04), rgba(107,33,168,0.06));
        border: 1px dashed rgba(255,215,0,0.12);
        border-radius: 8px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 0 16px;
      ">
        <span style="font-size:1.2rem; opacity:0.4;">📢</span>
        <span style="
          font-family:'Orbitron',monospace;
          font-size:0.65rem;
          letter-spacing:2px;
          color:rgba(255,255,255,0.18);
          text-transform:uppercase;
        ">Advertisement · 728×90</span>
      </div>
    `;
  }

  // ─── Popunder Ad ──────────────────────────────────────────────────────────
  function showPopunderIfNeeded() {
    // Only show once per session, before match starts
    const shown = sessionStorage.getItem(POPUNDER_KEY);
    if (shown) return;

    sessionStorage.setItem(POPUNDER_KEY, '1');

    const overlay = document.createElement('div');
    overlay.className = 'popunder-overlay';
    overlay.id = 'popunder-overlay';

    overlay.innerHTML = `
      <div class="glass-card popunder-box" style="
        max-width: 340px;
        width: 100%;
        padding: 28px 24px;
        text-align: center;
        border: 1px solid rgba(255,215,0,0.2);
      ">
        <div style="
          font-family:'Orbitron',monospace;
          font-size:0.6rem;
          letter-spacing:3px;
          color:rgba(255,255,255,0.25);
          text-transform:uppercase;
          margin-bottom:16px;
        ">Sponsored</div>

        <div style="
          width:100%;
          height:200px;
          background: linear-gradient(135deg,
            rgba(255,215,0,0.05),
            rgba(199,21,133,0.05),
            rgba(107,33,168,0.05)
          );
          border: 1px dashed rgba(255,255,255,0.12);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 20px;
        ">
          <span style="font-size:2.5rem; opacity:0.25;">📢</span>
          <span style="
            font-family:'Orbitron',monospace;
            font-size:0.65rem;
            letter-spacing:2px;
            color:rgba(255,255,255,0.2);
            text-transform:uppercase;
          ">300×250 Ad Space</span>
          <span style="
            font-size:0.7rem;
            color:rgba(255,255,255,0.15);
          ">Your ad could be here</span>
        </div>

        <button onclick="AdsSystem.closePopunder()" style="
          width:100%;
          padding:12px;
          background:linear-gradient(135deg,#FFD700,#B8860B);
          border:none;
          border-radius:10px;
          color:#1a0a00;
          font-family:'Rajdhani',sans-serif;
          font-size:1rem;
          font-weight:700;
          letter-spacing:1px;
          cursor:pointer;
          transition:all 0.2s ease;
        " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          ▶ Start Game
        </button>

        <p style="
          font-size:0.72rem;
          color:rgba(255,255,255,0.25);
          margin-top:12px;
          font-family:'Rajdhani',sans-serif;
        ">This ad supports the game. Thank you!</p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Auto-close after 8 seconds
    setTimeout(() => closePopunder(), 8000);
  }

  function closePopunder() {
    const overlay = document.getElementById('popunder-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => overlay.remove(), 300);
    }
  }

  // ─── Home Banner ──────────────────────────────────────────────────────────
  function showHomeBannerAd(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div style="
        width:100%;
        height:50px;
        background:linear-gradient(90deg,
          rgba(107,33,168,0.06),
          rgba(255,20,147,0.06),
          rgba(255,215,0,0.04),
          rgba(107,33,168,0.06)
        );
        border:1px dashed rgba(255,255,255,0.08);
        border-radius:8px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
      ">
        <span style="opacity:0.3;font-size:1rem;">📢</span>
        <span style="
          font-family:'Orbitron',monospace;
          font-size:0.6rem;
          letter-spacing:2px;
          color:rgba(255,255,255,0.15);
          text-transform:uppercase;
        ">Ad · 320×50</span>
      </div>
    `;
  }

  return {
    showBannerAd,
    showHomeBannerAd,
    showPopunderIfNeeded,
    closePopunder
  };
})();
