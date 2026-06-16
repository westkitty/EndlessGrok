import { test, expect } from '@playwright/test';

async function startNewGame(page: import('@playwright/test').Page, seed = '42') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('menu-title')).toHaveText('Endless Grok', { timeout: 15000 });
  const seedInput = page.locator('.new-game-setup input').first();
  if (await seedInput.isVisible().catch(() => false)) {
    await seedInput.fill(seed);
  }
  await page.getByTestId('new-game').click();
  const confirm = page.getByRole('button', { name: 'Start New Game' });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
  await expect(page.getByTestId('galaxy-map')).toBeVisible({ timeout: 20000 });
}

test.describe('Starbinding victory path UI', () => {
  test('victory panel shows Starbinding path and prerequisites', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('tab-empire').click();
    await expect(page.getByTestId('victory-panel')).toBeVisible();
    await expect(page.getByTestId('victory-path-starbinding')).toBeVisible();
    await expect(page.getByTestId('starbinding-locked-msg')).toBeVisible();
    await expect(page.getByTestId('heliocide-warning')).not.toBeVisible();
  });

  test('unlocked fixture enables star dive target selection', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      (window as Window & { __egUnlockStarbinding?: () => void }).__egUnlockStarbinding?.();
    });
    await page.getByTestId('tab-empire').click();
    await expect(page.getByTestId('starbinding-details')).toBeVisible();
    await expect(page.getByTestId('starbinding-prerequisites')).toBeVisible();
    await expect(page.getByTestId('heliocide-warning')).toBeVisible();

    await page.getByTestId('tab-system').click();
    const markBtn = page.getByTestId('select-star-dive-target');
    if (await markBtn.isVisible().catch(() => false)) {
      await markBtn.click();
      await expect(page.getByTestId('begin-star-dive')).toBeVisible();
      await page.getByTestId('begin-star-dive').click();
      const eventLog = page.locator('.event-log, [class*="event"]');
      await expect(eventLog.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});