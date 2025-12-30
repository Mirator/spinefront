import { PUZZLES } from '../core/constants.js';

/**
 * Get difficulty tier based on nights survived.
 */
export function getDifficultyTier(nightsSurvived) {
    if (nightsSurvived >= PUZZLES.difficulty.hard.nightsRequired) return 'hard';
    if (nightsSurvived >= PUZZLES.difficulty.medium.nightsRequired) return 'medium';
    return 'easy';
}

/**
 * Pick a random puzzle type.
 */
export function pickPuzzleType(rng) {
    const types = PUZZLES.types;
    const index = rng?.int?.(0, types.length - 1) ?? Math.floor(Math.random() * types.length);
    return types[index];
}

/**
 * Create initial state for a Sky Climb mini-game.
 */
function createSkyClimbState(difficulty, puzzleX, groundY) {
    const config = PUZZLES.skyClimb[difficulty];
    const platforms = [];
    const startY = groundY - 40;
    const stepHeight = 50;

    for (let i = 0; i < config.platforms; i++) {
        const offsetX = (Math.random() - 0.5) * 60;
        platforms.push({
            x: puzzleX + offsetX - config.platformWidth / 2,
            y: startY - (i + 1) * stepHeight,
            w: config.platformWidth,
            h: 12,
        });
    }

    return {
        type: 'sky_climb',
        difficulty,
        timer: config.timeLimit,
        platforms,
        goalY: startY - config.platforms * stepHeight - 20,
        completed: false,
        failed: false,
    };
}

/**
 * Create initial state for a Dodge Pulse mini-game.
 */
function createDodgePulseState(difficulty, puzzleX, groundY) {
    const config = PUZZLES.dodgePulse[difficulty];
    return {
        type: 'dodge_pulse',
        difficulty,
        pulseCount: config.pulses,
        pulseInterval: config.pulseInterval,
        pulseSpeed: config.pulseSpeed,
        pulsesFired: 0,
        pulses: [],
        nextPulseTimer: 0.5,
        centerX: puzzleX,
        centerY: groundY - 30,
        completed: false,
        failed: false,
        playerHit: false,
    };
}

/**
 * Create initial state for an Energy Channel mini-game.
 */
function createEnergyChannelState(difficulty, puzzleX, groundY) {
    const config = PUZZLES.energyChannel[difficulty];
    return {
        type: 'energy_channel',
        difficulty,
        duration: config.duration,
        timer: config.duration,
        driftSpeed: config.driftSpeed,
        zoneWidth: config.zoneWidth,
        zoneX: puzzleX,
        baseX: puzzleX,
        driftDirection: 1,
        channelProgress: 0,
        completed: false,
        failed: false,
    };
}

/**
 * Start a mini-game for the given puzzle type.
 */
export function startMiniGame(type, difficulty, puzzleX, groundY) {
    switch (type) {
        case 'sky_climb':
            return createSkyClimbState(difficulty, puzzleX, groundY);
        case 'dodge_pulse':
            return createDodgePulseState(difficulty, puzzleX, groundY);
        case 'energy_channel':
            return createEnergyChannelState(difficulty, puzzleX, groundY);
        default:
            return createSkyClimbState(difficulty, puzzleX, groundY);
    }
}

/**
 * Update Sky Climb mini-game.
 */
function updateSkyClimb(miniGame, player, dt) {
    miniGame.timer -= dt;

    if (miniGame.timer <= 0) {
        miniGame.failed = true;
        return;
    }

    // Check if player reached the goal
    if (player.y <= miniGame.goalY) {
        miniGame.completed = true;
    }
}

/**
 * Update Dodge Pulse mini-game.
 */
function updateDodgePulse(miniGame, player, dt) {
    // Fire new pulses
    if (miniGame.pulsesFired < miniGame.pulseCount) {
        miniGame.nextPulseTimer -= dt;
        if (miniGame.nextPulseTimer <= 0) {
            miniGame.pulses.push({
                radius: 10,
                maxRadius: 200,
            });
            miniGame.pulsesFired++;
            miniGame.nextPulseTimer = miniGame.pulseInterval;
        }
    }

    // Update existing pulses
    for (const pulse of miniGame.pulses) {
        pulse.radius += miniGame.pulseSpeed * dt;
    }

    // Check collision with player
    const playerCenterX = player.x + player.w / 2;
    const playerFeet = player.y + player.h;
    const playerOnGround = player.onGround;

    for (const pulse of miniGame.pulses) {
        const dist = Math.abs(playerCenterX - miniGame.centerX);
        const pulseHitRange = 20;
        const inPulseRing = dist >= pulse.radius - pulseHitRange && dist <= pulse.radius + pulseHitRange;

        if (inPulseRing && playerOnGround && pulse.radius < miniGame.centerY - player.y - player.h + 50) {
            miniGame.playerHit = true;
            miniGame.failed = true;
            return;
        }
    }

    // Remove pulses that are too large
    miniGame.pulses = miniGame.pulses.filter((p) => p.radius < p.maxRadius);

    // Check completion
    if (miniGame.pulsesFired >= miniGame.pulseCount && miniGame.pulses.length === 0) {
        miniGame.completed = true;
    }
}

/**
 * Update Energy Channel mini-game.
 */
function updateEnergyChannel(miniGame, player, input, dt) {
    // Drift the zone
    miniGame.zoneX += miniGame.driftDirection * miniGame.driftSpeed * dt;
    const maxDrift = 80;
    if (miniGame.zoneX > miniGame.baseX + maxDrift) {
        miniGame.driftDirection = -1;
    } else if (miniGame.zoneX < miniGame.baseX - maxDrift) {
        miniGame.driftDirection = 1;
    }

    // Check if player is in zone and holding interact
    const playerCenterX = player.x + player.w / 2;
    const inZone =
        playerCenterX >= miniGame.zoneX - miniGame.zoneWidth / 2 &&
        playerCenterX <= miniGame.zoneX + miniGame.zoneWidth / 2;

    if (inZone && input.interact) {
        miniGame.channelProgress += dt;
        miniGame.timer -= dt;

        if (miniGame.timer <= 0) {
            miniGame.completed = true;
        }
    } else if (input.interact && !inZone) {
        // Penalize being outside the zone while channeling
        miniGame.channelProgress = Math.max(0, miniGame.channelProgress - dt * 2);
    }
}

/**
 * Update a mini-game state.
 */
export function updateMiniGame(miniGame, player, input, dt) {
    if (!miniGame || miniGame.completed || miniGame.failed) return;

    switch (miniGame.type) {
        case 'sky_climb':
            updateSkyClimb(miniGame, player, dt);
            break;
        case 'dodge_pulse':
            updateDodgePulse(miniGame, player, dt);
            break;
        case 'energy_channel':
            updateEnergyChannel(miniGame, player, input, dt);
            break;
    }
}

/**
 * Check if mini-game is finished.
 */
export function isMiniGameFinished(miniGame) {
    return miniGame?.completed || miniGame?.failed;
}

/**
 * Check if mini-game was successful.
 */
export function isMiniGameSuccess(miniGame) {
    return miniGame?.completed === true;
}

/**
 * Get platforms for Sky Climb (used by physics/renderer).
 */
export function getSkyClimbPlatforms(miniGame) {
    if (miniGame?.type !== 'sky_climb') return [];
    return miniGame.platforms || [];
}
