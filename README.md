# 👑 Imran X Ludo — Premium Edition

A complete mobile-first prank Ludo web application with premium gaming UI.

## 🎮 Features

- **Password Protected** — Secure entry screen with lockout after failed attempts
- **Normal Mode** — Classic Ludo with robot AI (Easy / Medium / Hard)
- **X Mode** — Special mode with favorable dice mechanics (no robots)
- **Custom Dice Control** — Pin specific dice values in X Mode Easy
- **Premium UI** — Glassmorphism, glow effects, neon highlights, gold/pink/purple theme
- **Sound System** — Web Audio API sounds (dice, tokens, win, capture)
- **Confetti Win Screen** — Animated victory celebration
- **Ad Placeholders** — Banner and popunder slots ready for ad integration
- **4 Players** — Red, Blue, Yellow, Green with full Ludo rules
- **Mobile-First** — Touch optimized, responsive design

## 🔐 Password

```
Md Imran X Ludo 123
```

## 📁 File Structure

```
imran-x-ludo/
├── index.html          # Password screen
├── menu.html           # Main menu (Normal / X Mode)
├── setup.html          # Player & mode configuration
├── game.html           # Game board screen
├── win.html            # Win celebration screen
├── terms.html          # Terms & Conditions
├── contact.html        # Contact (placeholder)
├── 404.html            # 404 page
├── style.css           # Global styles (glassmorphism, variables)
├── animations.css      # All keyframe animations
├── auth.js             # Password protection + lockout
├── sound-system.js     # Web Audio API sound effects
├── dice-system.js      # Dice rolling logic
├── xmode-engine.js     # X Mode weighted dice engine
├── robot-ai.js         # Robot AI (Easy/Medium/Hard)
├── game-engine.js      # Core Ludo game engine + Canvas renderer
├── ui-controller.js    # Game UI management
└── ads-system.js       # Ad placeholder system
```

## 🚀 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)` folder
4. Visit `https://yourusername.github.io/imran-x-ludo/`

### Netlify
1. Drag and drop the folder into [netlify.com/drop](https://netlify.com/drop)
2. Or connect your GitHub repo and deploy automatically

No build step required — pure HTML/CSS/JS, runs entirely in browser.

## 🎯 X Mode Guide

| Difficulty | Lucky Color           | Other Colors              |
|------------|----------------------|--------------------------|
| Easy       | Mostly 5 or 6        | Mostly 1, 2, 3, 4        |
| Medium     | Frequently 4, 5, 6   | Normal fair dice         |
| Hard       | Fair dice (no edge)  | Fair dice (no edge)      |

- Up to **2 players** can select a lucky color
- Easy mode includes **Custom Dice Control** to pin preferred numbers
- **No robots** allowed in X Mode

## 🔒 Security

- Password is stored as a constant in `auth.js`
- Auth state is stored in `localStorage`
- After **3 wrong attempts**: 15s lockout
- After **6 wrong attempts**: 30s lockout  
- After **9+ wrong attempts**: 60s lockout

## 🛠 Tech Stack

- Vanilla HTML5, CSS3, JavaScript (ES6+)
- Canvas API for game board rendering
- Web Audio API for sound effects
- LocalStorage for game state persistence
- Google Fonts (Cinzel Decorative, Rajdhani, Orbitron)
- No external libraries or frameworks
- No backend required

---
*Imran X Ludo — Premium Edition · Built with ❤️*
