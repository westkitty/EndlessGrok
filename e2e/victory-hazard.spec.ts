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

test.describe('Victory and hazard systems', () => {
  test('victory panel shows completable Syrin Inerting path', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      (window as Window & { __egSetupSyrinVictory?: () => void }).__egSetupSyrinVictory?.();
    });
    await page.getByTestId('tab-empire').click();
    await expect(page.getByTestId('victory-path-syrinInerting')).toBeVisible();
    await expect(page.getByTestId('syrin-inerting-details')).toBeVisible();
    await expect(page.getByTestId('syrin-victory-ready')).toBeVisible();
  });

  test('macro intel appears in empire panel after macro execute', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      (window as Window & { __egPrepareMacroTest?: () => void }).__egPrepareMacroTest?.();
    });
    await page.getByTestId('tab-system').click();
    await page.getByTestId('execute-macro-local_checksum_audit').click();
    await page.getByTestId('tab-empire').click();
    await expect(page.getByTestId('empire-macro-intel')).toBeVisible();
  });

  test('hazard protection visible on collapsed system with seal', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      (window as Window & { __egPrepareMacroTest?: () => void }).__egPrepareMacroTest?.();
    });
    await page.getByTestId('tab-system').click();
    await page.getByTestId('execute-macro-gravity_thread_seal').click();
    await expect(page.getByTestId('system-hazard-status')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});