import { describe, expect, it } from 'vitest';
import { AURA } from '../core/constants.js';
import { applyPlayerAuraHit, updateAuraRecovery } from '../systems/aura.js';

describe('Aura System V2 (No Burden)', () => {
    const mockPlayer = () => ({
        x: 100,
        w: 10,
        aura: 100,
        maxAura: 100,
        auraHitCooldown: 0,
        auraRecoverDelay: 0,
        critical: false,
    });

    const mockState = () => ({
        currency: 0,
        relicModifiers: {},
        playerFallen: false,
        hudText: '',
    });

    const mockWorld = { width: 1000 };
    const mockBaseWorld = { width: 1000, walls: [0, 1000] }; // Whole world is territory

    it('hit damage is constant regardless of gold held', () => {
        const player = mockPlayer();
        const state = mockState();

        // Case 1: 0 Gold
        state.currency = 0;
        applyPlayerAuraHit(player, state);
        const damageZeroGold = 100 - player.aura;

        // Reset
        player.aura = 100;
        player.auraHitCooldown = 0;

        // Case 2: 1000 Gold (Massive Burden previously)
        state.currency = 1000;
        applyPlayerAuraHit(player, state);
        const damageRich = 100 - player.aura;

        expect(damageRich).toBe(damageZeroGold);
        expect(damageRich).toBe(AURA.hitLoss);
    });

    it('recovers aura even with massive gold hoard (no instability)', () => {
        const player = mockPlayer();
        const state = mockState();

        state.currency = 1000; // Previously this would cause drain
        player.aura = 50;

        // Simulate 1 second inside territory
        updateAuraRecovery(player, state, mockBaseWorld, mockWorld, 1.0);

        expect(player.aura).toBeGreaterThan(50);
    });

    it('recovers at full speed regardless of gold (no recovery penalty)', () => {
        const player1 = mockPlayer();
        const state1 = mockState();
        state1.currency = 0;

        const player2 = mockPlayer();
        const state2 = mockState();
        state2.currency = 1000;

        player1.aura = 50;
        player2.aura = 50;

        const dt = 1.0;
        updateAuraRecovery(player1, state1, mockBaseWorld, mockWorld, dt);
        updateAuraRecovery(player2, state2, mockBaseWorld, mockWorld, dt);

        expect(player1.aura).toBeCloseTo(player2.aura, 5);
        // Expected gain is exactly recoverRate * dt
        const expectedAura = 50 + AURA.recoverRate * dt;
        expect(player1.aura).toBeCloseTo(expectedAura, 5);
    });
});
