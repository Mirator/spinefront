import { HINT_CONFIG } from '../core/constants.js';

export function createHintState() {
    return {
        activeHint: null, // { text, x, y }
        shownHints: new Set(),
        objectiveBanner: null, // { text, timer }
    };
}

export function updateHints(state, player, world, dt, shrine) {
    // Reset active hint each frame
    state.hints.activeHint = null;

    // 1. Proximity Hints
    // Shrine Upgrade
    if (!state.hints.shownHints.has('shrine_upgrade')) {
        const dist = Math.hypot(player.x - shrine.x, player.y - shrine.y);
        if (dist < HINT_CONFIG.proximityRadius) {
            state.hints.activeHint = {
                text: '[E] Upgrade Towers',
                x: shrine.x + shrine.w / 2,
                y: shrine.y - 40,
            };
        }
    }

    // Puzzle Challenge
    if (!state.hints.shownHints.has('puzzle_start')) {
        const puzzle = state.jumpPuzzles.find(p => p.state === 'active');
        if (puzzle) {
            const dist = Math.hypot(player.x - puzzle.x, player.y - (world.ground - 50));
            if (dist < HINT_CONFIG.proximityRadius) {
                state.hints.activeHint = {
                    text: '[E] Begin Challenge',
                    x: puzzle.x,
                    y: world.ground - 120,
                };
            }
        }
    }

    // 2. Objective Banner Logic
    if (state.hints.objectiveBanner) {
        state.hints.objectiveBanner.timer -= dt;
        if (state.hints.objectiveBanner.timer <= 0) {
            state.hints.objectiveBanner = null;
        }
    } else {
        // Show banner at start of day
        if (!state.isNight && state.dayTimer < 1 && !state.hints.shownHints.has(`day_${state.nightsSurvived}_start`)) {
            state.hints.objectiveBanner = {
                text: 'Prepare your defenses before nightfall',
                timer: HINT_CONFIG.bannerDuration,
            };
            state.hints.shownHints.add(`day_${state.nightsSurvived}_start`);
        }
    }
}
