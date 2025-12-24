import { expect, test } from '@playwright/test';

const MOBILE_PROJECT = 'chromium-mobile';
const DESKTOP_PROJECT = 'chromium-desktop';

test.describe('mobile controls', () => {
  test('are visible and respond to taps on mobile viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'Runs only in the mobile project');
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');

    const controls = page.locator('.mobile-controls');
    await expect(controls).toBeVisible();
    const computedDisplay = await controls.evaluate((node) => getComputedStyle(node).display);
    expect(computedDisplay).not.toBe('none');

    const buttons = [
      { locator: page.locator('#control-up'), text: '▲', label: 'Jump / Move up' },
      { locator: page.locator('#control-left'), text: '◀', label: 'Move left' },
      { locator: page.locator('#control-down'), text: '▼', label: 'Move down' },
      { locator: page.locator('#control-right'), text: '▶', label: 'Move right' },
      { locator: page.locator('#control-jump'), text: 'Jump' },
      { locator: page.locator('#control-attack'), text: 'Attack' },
      { locator: page.locator('#control-interact'), text: 'Interact' },
      { locator: page.locator('#control-restart'), text: 'Restart' },
    ];

    for (const { locator, text, label } of buttons) {
      await expect(locator).toBeVisible();
      await expect(locator).toHaveText(text);
      if (label) {
        expect(await locator.getAttribute('aria-label')).toBe(label);
      }
    }

    const up = page.locator('#control-up');
    const attack = page.locator('#control-attack');

    await up.dispatchEvent('pointerdown');
    await expect(up).toHaveClass(/pressed/);
    await up.dispatchEvent('pointerup');
    await expect(up).not.toHaveClass(/pressed/);

    await attack.dispatchEvent('pointerdown');
    await expect(attack).toHaveClass(/pressed/);
    await attack.dispatchEvent('pointerup');
    await expect(attack).not.toHaveClass(/pressed/);
  });

  test('restart control triggers reset flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'Runs only in the mobile project');
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');

    const sampleCenterPixel = async () => {
      return page.evaluate(() => {
        const canvas = document.getElementById('game');
        const ctx = canvas.getContext('2d');
        const x = Math.floor(canvas.width / 2);
        const y = Math.floor(canvas.height / 2);
        return Array.from(ctx.getImageData(x, y, 1, 1).data);
      });
    };

    await page.waitForSelector('.mobile-controls');
    const before = await sampleCenterPixel();

    const restart = page.locator('#control-restart');
    await restart.dispatchEvent('pointerdown');
    await restart.dispatchEvent('pointerup');
    await page.waitForTimeout(200);

    const after = await sampleCenterPixel();
    const beforeBrightness = before[0] + before[1] + before[2];
    const afterBrightness = after[0] + after[1] + after[2];

    expect(afterBrightness).toBeGreaterThan(beforeBrightness);
  });
});

test.describe('desktop viewport', () => {
  test('hides mobile controls on larger screens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'Runs only in the desktop project');
    await page.goto('/');

    const controls = page.locator('.mobile-controls');
    await expect(controls).toBeHidden();

    const computedDisplay = await controls.evaluate((node) => getComputedStyle(node).display);
    expect(computedDisplay).toBe('none');
  });
});
