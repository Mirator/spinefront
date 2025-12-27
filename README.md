# spinefront

## Project purpose
Spinefront is a fast-paced cooperative action builder where players push a contested frontline by fighting enemies, fortifying positions, and using vertical routes to outmaneuver threats. The project aims to deliver a concise multiplayer-ready slice that proves out the core movement, combat, and building loops while staying light enough for quick iteration and GitHub Pages deployment.

### Current feature list
- Day/night cycle that alternates every 30 seconds and drives wave pacing.
- Wave survival: enemies spawn at night from either side and target defensive structures.
- Defenses: two walls and two towers with individual health bars; towers auto-fire at nearby enemies.
- Shrine tech: spend 10 gold at the central shrine to increase tower fire rate.
- Economy: earn 10 gold each sunrise and 5 gold at the start of a night while managing gold burden.
- Aura survival: taking damage drains aura and spills gold; hitting zero puts you in a critical state where the next hit knocks you off the island.
- Gold burden: carrying gold slows sprint speed and destabilizes aura recovery—drop it deliberately or spend it to stay mobile.
- Optional jump puzzles: daytime climbing routes visible from the lane that trade daylight for a reward choice (gold, relic, or legacy).
- Victory: survive **3 nights**.
- Restart: click the HUD restart button or press **R** at any time.
- Game menu: opens automatically on page load and can be reopened with **Esc** or the header **Menu** button. The menu pauses gameplay, lists objectives and controls, and lets you start or restart a run.
- Responsive viewport: the canvas scales to your browser size and includes a header **Go fullscreen** toggle for an immersive layout.
- Touch-friendly overlays: a virtual joystick (with a fallback d-pad) and on-screen Jump/Attack/Interact buttons appear on small or touch devices and disable automatically when the menu is open.

## Running the project locally
The project is intended to run as a front-end app with a lightweight dev server.

- Quick play: run `npm run dev` to start the Vite dev server and open the local URL.
- Local static serve: build with `npm run build` and serve the `dist/` output (or use `npm run preview`).

1. Install Node.js 18+.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start a hot-reloading dev server:
   ```bash
   npm run dev
   ```
4. Build for production (outputs to `dist/`):
   ```bash
   npm run build
   ```
5. Run end-to-end tests (requires a dev server to start automatically; uses Playwright):
   ```bash
   npm run test:e2e
   ```
   For a headed browser during debugging:
   ```bash
   npm run test:e2e:headed
   ```
6. Preview a production build locally (after running `npm run build`):
   ```bash
   npm run preview
   ```
7. Alternatively, serve the static output with your preferred tool, for example:
   ```bash
   npx serve dist
   ```

> If a different package manager or script naming is used in your fork, adapt the commands accordingly.

## Deployment
- GitHub Pages URL: `https://<your-username>.github.io/spinefront/` (replace `<your-username>` with your GitHub handle).
- Build artifacts: `npm run build` produces the static site in `dist/`.
- Publish options:
  - Push `dist/` to a `gh-pages` branch and enable Pages for that branch.
  - Use an action such as `peaceiris/actions-gh-pages` to build and deploy on every push to `main`.
- Set the repository’s Pages base path if deploying to a project site so asset URLs resolve correctly (e.g., `vite.config` `base` option when using Vite).

## Controls reference
- Move: **A/D** or **←/→**
- Jump: **Space**
- Sprint: Hold **Shift** while moving
- Attack: **F** to swing your sword
- Interact: **E** near the shrine to unlock tower tech (costs 10 gold); **E+↓** to place a barricade during the day or drop gold to shed burden
- Reset: **R** to restart immediately; a Restart button also appears after win/lose
- Menu: **Esc** or the header **Menu** button to open the in-game menu (pauses the run; start or restart from there)
- Fullscreen: Click **Go fullscreen** in the top chrome bar to enter or exit fullscreen; the canvas will resize to fit your display.
- Touch/mobile: Drag the on-screen joystick (or use the d-pad fallback) to move, and tap the Jump, Attack, and Interact buttons for actions when using a touch device.

## Project structure
- `src/core`: shared constants and input helpers.
- `src/state`: entity factories and the central game store/reset helpers.
- `src/systems`: simulation systems (cycle handling, combat, spawning, effects, movement).
- `src/render`: canvas and HUD renderer that consume immutable snapshots.
- `src/input/domControls.js`: DOM bindings for keyboard and touch input.
- `src/main.js`: game loop orchestrator used by the Vite bundle entry.

## Win and lose conditions
- Win: Endure through **3 nights**. A victory banner appears and you can restart from the HUD.
- Lose: Aura collapses when you are hit while in a critical, zero-aura state, sending the player off the island.

## Contributing and testing
- Use short-lived feature branches and open pull requests that describe the change and any player-facing impact.
- Keep docs updated when you add or modify controls, objectives, or buildables.
- Run available quality gates before opening a PR:
  - `npm run lint` (static analysis, when configured)
  - `npm test` (unit tests via Vitest)
- For UI changes, include screenshots and summarize user impact in the PR body.
