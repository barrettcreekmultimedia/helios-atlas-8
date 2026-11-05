# HELIOS ARENA V8 — SHATTERED WORLDS

**A four-vessel, local multiplayer space-combat sandbox using the real PlayCanvas Engine.**

A fresh combat-focused successor to Helios Atlas V7. The shipboard science mission system has been removed. The solar system, mapped planets, dwarf planets and moons remain as a single shared 3D world with destructible bodies and persistent drifting rubble.

## Run it on GitHub Pages

1. Extract the `helios-atlas-v8-playcanvas-github.zip` archive.
2. Open your existing GitHub repository or make a new repository.
3. Upload **all contents inside** the extracted directory into the repository **root** (where `index.html` should appear). Replace the V7 files. Delete old unused `src` files if present; the V8 `index.html` only runs V8 modules.
4. In **Settings → Pages**, choose **Deploy from branch**, branch `main`, directory `/(root)`.
5. Open `https://YOUR-USERNAME.github.io/REPO-NAME/` and hard-refresh (Ctrl+Shift+R) if cached.

For local development, run `run-local.bat` (Windows, Python 3 required), or use `python -m http.server 8000` from the project directory and visit `http://localhost:8000/`. A local web server is required to load ES modules. The PlayCanvas engine downloads from the jsDelivr CDN; internet access is required for first load unless you vendor the engine yourself. **GitHub Pages needs no build step, database, matchmaking service, or API key.**

## Match types

- **2 vs 2:** Both local players belong to Team Azure against two Team Crimson AI pilots. With one local player, a friendly bot fills the second Azure slot.
- **Free For All:** Four independent pilots, with one or two controlled locally and the remainder controlled by bots.
- **Five starting sectors**: Earth, Mars, Ceres/Asteroid Belt, Jupiter and Saturn. No artificial arena boundaries; travel anywhere in the solar system.
- Select **rookie, standard or veteran** bot skill.
- **Last surviving team/pilot wins**. There are no mid-round respawns. Returning to the hangar starts a fresh round and reconstructs destroyed worlds.

## Ship classes

| Class | Specialty | Hull | Shields | Gameplay |
|---|---|---:|---:|---|
| Spectre Interceptor | Evasion | 95 | 70 | Quickest acceleration and highest firing rate |
| Vanguard Assault | Versatile | 145 | 100 | Balanced speed, armour and weapons |
| Titan Dreadnought | Firepower | 235 | 135 | Heavy armour, slow handling, powerful weapons |

All have two functioning weapon systems: **rapid pulse cannon** (primary) and **target-seeking missiles** (secondary). Primary shots travel through the world; missiles steer toward the current target. Both have cooldowns and hit collision volumes. Missile lock can target enemy ships or **intact planets/moons**. Pulses and missiles can also shatter asteroids. Friendly fire between allied ships is disabled in 2v2, but the environment remains dangerous.

## Two-player controls

The default multiplayer configuration is local split-screen (two viewports on one PC). It is **not internet/network multiplayer**, since a static GitHub Pages site has no authoritative multiplayer server. A controller is recommended for Player 2, but a two-keyboard layout is included.

| Action | Player 1 (keyboard + mouse) | Player 2 (keyboard) | Player 2 (Xbox-style gamepad) |
|---|---|---|---|
| Forward/reverse | W / S | I / K | RT / LT |
| Strafe | A / D | J / L | Right stick horizontal |
| Ascend/descend | Space / C | Period / Comma | Right stick vertical |
| Steer (pitch/yaw) | Mouse after click to capture | Arrow keys | Left stick |
| Roll | Q / E | [ / ] | — |
| Boost | Left Shift | Right Shift | RB |
| Brake | X | Backspace | LB |
| Pulse cannon | Left mouse button / F | N | A |
| Guided missile | Right mouse button / R | M | B |
| Cycle targets | Tab | Enter | X |
| Toggle targeting ships/planets | T | Y | Y |
| Pause / resume | P / Escape | P / Escape | Pause via button |

For solo mode, the first connected controller can control Player 1.

**Important:** Click the 3D scene to capture mouse input. Escape releases it and pauses. Player 1 and Player 2 steer separately even though they share one graphics canvas.

## Planet destruction and physics

- Intact planets/dwarf planets/moons have damageable structural integrity. The Sun is a persistent lethal hazard, not destructible.
- Pulse cannon and missile impacts chip away at integrity. When an object reaches zero, its mapped globe disappears in a visual shattering event, replaced by **moving angular mesh fragments** carrying initial explosion impulses.
- These pieces continue moving and rotating for the rest of the round (a performance cap limits the total count). They collide with ships, other projectiles and intact planets. Planet size, orbital separation and chunk speeds are **artistic/gameplay scale**, not scientifically accurate physics.
- Asteroids can break into smaller collidable fragments.
- Ships accelerate using thrusters, preserve inertia, and brake with counter-thrust. Ship-to-ship, debris, planetary and solar collisions cause damage. This is custom gameplay physics, not a rigid-body simulation with a solver for every piece.

## File structure

```text
index.html               # Game setup, split-screen HUD, match overlays
style.css                # Responsive UI and lobby
src/main.js              # Input, gamepad, menus, HUD, PlayCanvas app bootstrap
src/combat.js            # Ships, bot tactics, projectiles, damage, victory
src/world.js             # Solar system, planet destruction, debris simulation
src/graphics.js          # Procedural spacecraft and shard meshes
src/rules.js             # Independent testable class stats and collision rules
src/data.js              # Lean celestial map data
src/atlas.js             # Optional high-quality map sources
src/music.js             # Original procedural music
assets/*.jpg             # Included map fallbacks
.nojekyll                # GitHub Pages compatibility
tests/*.test.mjs         # Rule and package tests
run-local.bat            # Windows local server launcher
```

## Tests and requirements

With Node 22 or newer: `npm run check` and `npm test`. These cover source parsing, collision maths, team rules, shielding, ship stats, match winner logic and UI structure. WebGL2 must be supported for gameplay. Testing is best on a desktop with a keyboard/mouse and controller.

**Browser validation limitation:** Automated tests and a browser-based static HUD inspection have passed, but we could not complete full live 3D WebGL testing in the authoring environment because loading the external PlayCanvas CDN was blocked. Treat this as a playable prototype and test the full game in GitHub Pages after deploying.
