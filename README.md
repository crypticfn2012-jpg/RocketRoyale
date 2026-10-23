# RocketRoyale

RocketRoyale is a browser-based 3D car-football game built with Three.js. Drive a customisable car around an enclosed neon stadium, launch yourself into the air, manage boost pads, bump the opponent, and score.

## Run locally

Use a local HTTP server so the ES modules and supplied FBX models can load:

```powershell
cd RocketRoyale
python -m http.server 8080
```

Then open `http://localhost:8080`. The project uses relative asset paths and is designed to work on GitHub Pages.

## Modes

- **Ranked Match** — a five-minute duel against the stadium bot. Wins and losses adjust saved MMR.
- **Casual Match** — the same duel without ranked MMR changes.
- **Free Play** — solo practice without a match timer or active opponent.

Matches include kickoff countdowns, boost pads, ball physics, scoring, automatic kickoffs, a scoreboard and end-of-match rewards. Car-to-car contact now resolves overlap and transfers momentum; goals trigger team-coloured celebration particles.

## Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Accelerate / reverse | W / S | Left stick up / down |
| Steer | A / D | Left stick left / right |
| Jump / second-press dodge | Space | A / bottom face button |
| Boost | Left Shift | Right trigger or RB |
| Powerslide | Left Ctrl | Left trigger or LB |
| Reset car | R | — |
| Toggle Ball Camera | C | — |
| Pause / resume | Esc | — |

Touch controls appear on supported mobile devices. Ball Camera can also be toggled in Settings. Camera distance and height now use the full displayed slider ranges.

## Garage, shop and rewards

- Equip paint finishes, boost colours and toppers; purchases and selections are saved locally.
- The shop uses credits earned from match results and playtime rewards.
- Claim a daily reward. The streak advances on consecutive local calendar days and restarts after a missed day.
- On CrazyGames, the optional SDK provides account access and cloud data where available. Outside the platform the game can still run locally without the SDK.

## Technical notes

Three.js is loaded from jsDelivr, and the supplied car and ball FBX assets are loaded at runtime. If an FBX model fails to load, the game uses fallback geometry. The menu and HUD are responsive, and reduced-motion preferences are respected by menu animations.
