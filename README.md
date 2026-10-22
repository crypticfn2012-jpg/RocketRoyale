# RocketRoyal

RocketRoyal is a static Three.js car-football game built for modern desktop browsers. It uses the supplied `Car.fbx` and `rocket-ball.fbx` gameplay assets, so serve it over HTTP rather than opening the HTML file directly:

```powershell
cd RocketRoyal
python -m http.server 8080
```

Open `http://localhost:8080`. The build uses relative project paths and is compatible with GitHub Pages.

## Play

- **Ranked Duel** — five-minute match against the arena bot. Wins and losses change your saved MMR and award credits.
- **Casual Duel** — five-minute match with the same gameplay and credits but no MMR change.
- **Free Play** — solo practice with no timer or bot.
- **Item Shop** — buy and equip 30 persistent paint finishes, boost trails, and toppers. These update the actual gameplay car.
- **Rewards** — claim one daily credit reward, and earn a playtime reward every five minutes of active play.

Your rank, credits, purchases, equipped build, settings, and reward timers are saved locally. If CrazyGames Data is enabled for the published game, those values are also synced through the platform.

## Controls

`W/S` accelerate/reverse, `A` steer left, `D` steer right, `Space` jump/dodge, `Left Shift` boost, `Left Ctrl` powerslide, `R` reset, and `Esc` pause.

Gamepad: left stick drives and steers; south/bottom face button jumps; right trigger (or south button) boosts; left trigger (or west/left face button) powerslides. Touch devices get drive, boost, drift, and jump buttons. The camera stays behind the car, while the HUD arrow points toward the ball.

## CrazyGames

The v3 SDK is optional for local development. The game safely initializes it before using account, data, lifecycle, or advertising APIs. On CrazyGames, the account button opens the platform sign-in prompt, match/pause lifecycle events are reported, platform data is used when available, and a midgame ad may be requested after a match. An unavailable or blocked ad never stops play.
