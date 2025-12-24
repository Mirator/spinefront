# spinefront

## Project purpose
Spinefront is a fast-paced cooperative action builder where players push a contested frontline by fighting enemies, fortifying positions, and using vertical routes to outmaneuver threats. The project aims to deliver a concise multiplayer-ready slice that proves out the core movement, combat, and building loops while staying light enough for quick iteration and GitHub Pages deployment.

### MVP feature list
- Core loop: explore the map, gather resources, and hold or advance the frontline while responding to enemy waves.
- Player movement set: smooth locomotion, sprinting, and directional climbing for navigating vertical spaces.
- Combat interactions: light and heavy attacks, basic enemy AI, and clear hit feedback.
- Building toolkit: quick-access build menu, placeable walls/platforms, and repair/dismantle interactions to reconfigure defenses.
- Session flow: solo or small-group play with a match timer, win/lose resolution, and a summary screen that highlights contributions.

## Running the project locally
The project is intended to run as a front-end app with a lightweight dev server.

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
5. Preview a production build locally (after running `npm run build`):
   ```bash
   npm run preview
   ```
6. Alternatively, serve the static output with your preferred tool, for example:
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
- Move: WASD / arrow keys
- Sprint: Hold Shift while moving
- Attack: Left mouse button (tap for light, hold for charged/heavy if supported)
- Build: Press **B** to open the build menu, choose a structure, then left-click to place
- Climb: Jump/Space near a climbable surface to latch and move with WASD

## Win and lose conditions
- Win: Hold the frontline until the match timer expires, or capture all objectives and trigger the extraction phase without losing the base core.
- Lose: Base core destroyed, squad wipe with no respawns remaining, or extraction timer expires before objectives are secured.

## Contributing and testing
- Use short-lived feature branches and open pull requests that describe the change and any player-facing impact.
- Keep docs updated when you add or modify controls, objectives, or buildables.
- Run available quality gates before opening a PR:
  - `npm run lint` (static analysis, when configured)
  - `npm test` (unit/e2e suites, when available)
- For UI changes, include screenshots and summarize user impact in the PR body.
