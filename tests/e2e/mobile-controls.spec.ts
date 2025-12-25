import { expect, test } from '@playwright/test';

const MOBILE_PROJECT = 'chromium-mobile';
const DESKTOP_PROJECT = 'chromium-desktop';

test.describe('mobile controls', () => {
  test('are visible and respond to taps on mobile viewport', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'Runs only in the mobile project');
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');

    await page.click('canvas#game');
    await page.keyboard.press('Enter');

    const controls = page.locator('.mobile-controls');
    await expect(controls).toBeVisible();
    await expect(controls).not.toHaveAttribute('data-menu-open', 'true');
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

    await expect(page.locator('#control-restart')).toHaveCount(0);
  });

  test('keyboard restart binding resets the scene', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== MOBILE_PROJECT, 'Runs only in the mobile project');
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');

    await page.evaluate(() => {
      const w = window as unknown as { __resetCount: number };
      w.__resetCount = 0;
      window.addEventListener('spinefront:reset', () => {
        w.__resetCount += 1;
      });
    });

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
    await page.click('canvas#game');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.mobile-controls:not([data-menu-open=\"true\"])');
    const before = await sampleCenterPixel();

    await page.keyboard.press('r');
    await page.waitForFunction(() => ((window as unknown as { __resetCount?: number }).__resetCount || 0) > 0);

    const after = await sampleCenterPixel();
    const beforeBrightness = before[0] + before[1] + before[2];
    const afterBrightness = after[0] + after[1] + after[2];

    expect(afterBrightness).not.toBe(beforeBrightness);
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
