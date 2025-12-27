# Spinefront Scope & Current Mechanics

## High-level goal
Spinefront is a compact, wave-based cooperative action-builder. The player defends a central keep and crown across a sequence of short day/night cycles, using mobility, melee combat, automated defenses, and shrine tech to hold a thin frontline. Runs are short (minutes), tuned for iteration and GitHub Pages delivery.

## Core loop
- **Preparation (daytime, ~60s):** Repair walls/towers, place temporary barricades, reposition, and bank shrine upgrades. Earn dawn income and ready for the next onslaught.
- **Assault (nighttime, ~60s):** Enemies drop in from both sides, march toward defenses, and attack walls, towers, or the player. Survive the wave timer to reach sunrise income and a brief breather.
- **Progression:** Endure **3 nights** to trigger an island ascension. Each new sky island applies a distinct modifier set that alters run feel.

## Player kit
- **Movement:** Grounded side-scroller with horizontal acceleration (220 u/s walk, 340 u/s sprint) and a single jump (650 force). Gravity is high (1800) to keep arcs tight; world clamps prevent leaving the play lane.
- **Combat:** Melee sword swing with 0.4s cooldown and ~1.0s arc duration window; damage is 25 per hit, with multi-target arc detection.
- **Crown custody:** The player starts with the crown. Any enemy collision drops it where you stand; it must be re-picked within **10s** or the run is lost.
- **Aura (life shield):** Starts at 100. Taking aura damage deals 38 loss, applies short immunity (0.65s), delays recovery (1.1s), and drops up to 3 gold. Aura recovers only when you hold at least 4 gold **and** stand within owned territory (around the walls), ticking at 12 per second. Hitting 0 aura knocks the player into a loss state.

## Economy & interaction
- **Income:** +10 gold each dawn; +5 gold at the start of night. Island modifiers may add flat bonuses.
- **Shrine tech:** Central shrine; interact to unlock/upgrade. Two branches:
  - **Rapid Volley (cadence):** Increases tower fire rate per tier.
  - **Sun Lances (power):** Increases tower damage per tier.
  Costs per tier: 10 → 16 → 24 gold (up to three tiers). Unlock state persists when ascending.
- **Repairs:** During daytime, interact near a damaged wall or tower (within ~42 px) to spend 4 gold and restore 30 HP.
- **Barricades:** During daytime, interact + down to place a temporary barricade at 7 gold. 36×28 footprint, 70 HP, cannot overlap structures.

## Structures
- **Walls (2):** 40×60, 120 HP base (scaled by island modifiers). Positioned near flanks to bound owned territory.
- **Towers (2):** 36×90, 160 HP. Auto-target enemies within ~360 px. Baseline fire cadence 1.4s; base projectile damage 18, scaled by shrine tech and island modifiers.
- **Shrine:** 50×50 hub at centerline; gate for tech purchases and a key interactable hotspot.

## Enemies & behaviors
- **Corrupted footsoldier (default):** Ground melee. Spawns via wyvern carrier that drops the unit near front defenses; afterwards walks toward nearest living structure (or player) and attacks for 12 damage at 1/s.
- **Sapper (from night 2+):** Slightly bulkier ranged unit. Uses preferred standoff (~200 px) to fire 14-damage bolts at 0.8/s; repositions if too close/far. Also arrives via carrier drop.
- **Wyvern carrier:** Not a target, but controls spawn timing. Carries enemies above ground, speeds them horizontally, and performs a short drop sequence to seed the lane near structures. Island modifiers can increase carrier speed or adjust drop padding.
- **Targeting:** Enemies prioritize nearby living structures; if none are close, they continue forward. Damage applies to walls/towers or the player (causing crown drop and aura hits).

## Waves & pacing
- **Cycle length:** Day and night alternate every `world.dayLength` (default 60s). Visual sky blend tracks the timer.
- **Night count:** Wave identifier increments each night; sunrise increments nights survived.
- **Wave definitions:**
  - Night 1: slower interval (~2.5s) melee-only.
  - Night 2: tighter interval (~1.5s) plus sappers added to the mix.
  - Night 3: sustained pressure (~1.5s) melee + sappers.
  Procedural descriptors introduce bursts (every 4th spawn) and side bias (default 50/50, adjusted by island modifiers).
- **Spawns:** Each descriptor encodes spawn side, enemy type, burst flag, and interval. Burst spawns warn via edge flash. Wyvern carriers drop units near surviving structures to keep pressure relevant.

## Territory, loss, and victory
- **Owned territory:** Derived from wall anchors plus padding; used for aura recovery eligibility and to contextualize frontlines.
- **Loss states:**
  - Crown lost (timer expires after drop)
  - Aura depletion (player falls)
  - Explicit crown contact defeats (contact while holding crown triggers drop; loss only if not recovered)
- **Victory/ascension:** Survive 3 nights without losing the crown or aura to trigger an ascension prompt. Accepting ascension resets the run on the next island while preserving learned shrine unlocks and updating island history.

## Islands & modifiers
Islands rotate, avoiding repeats until the pool is exhausted. Each island adds a unique twist:
- **Windward Gardens:** Faster tower cadence (–15% fire interval) and +15% projectile damage.
- **Aurora Bastion:** +5 income at dawn/dusk and shrine starts unlocked.
- **Stonebloom Spires:** +30% wall HP.
- **Tempest Truss:** Wyverns fly 20% faster, drop closer, waves arrive 15% faster, and spawn bias nudges slightly left.
- **Ember Reliquary:** +10% enemy HP but +20% tower projectile damage.

## Input & UX scaffolding
- **Keyboard:** A/D or arrows to move, Space to jump, Shift to sprint, F to attack, E to interact (shrine/repair/barricade), Down+Interact for barricades, R to restart, Esc to toggle pause/menu.
- **Touch:** Virtual joystick + d-pad fallback; on-screen Jump/Attack/Interact buttons. Menu pause gate keeps overlays inactive when open.
- **HUD:** Displays gold, shrine tech selection, wave/night info, crown status, and contextual HUD text. Menu panel lists objectives, controls, and island bonus, with a start/resume button. Outcome overlay communicates victory/defeat and restart options.

## Hooks for future mechanics
- **State surfaces:** Central store tracks world, player, structures, barricades, wave descriptors, shrine tech, and island modifiers. Pure functions handle resets, ascension, and deterministic RNG seeding for reproducibility.
- **Extensibility seams:**
  - Add enemy variants to wave definitions/descriptors.
  - Extend shrine branches or add new tech trees using `SHRINE_TECH` and `state.shrineTech`.
  - Introduce buildables via `createStructureSets`/barricade patterns and repair/placement UX.
  - Modify island bonuses to change pacing, side bias, or drop targeting.
  - Alter aura/territory rules to reward aggression, mobility, or economy playstyles.
