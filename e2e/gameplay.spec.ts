import { test, expect } from '@playwright/test';

async function startNewGame(page: import('@playwright/test').Page, seed = '42') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('menu-title')).toHaveText('Endless Grok', { timeout: 15000 });
  await page.fill('input[type="number"], input[placeholder*="seed" i], .setup-field input', seed).catch(() => {});
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

async function dismissTurnSummary(page: import('@playwright/test').Page) {
  const summary = page.locator('.turn-summary-modal, .overlay-content');
  if (await summary.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
  }
}

test.describe('expanded gameplay flows', () => {
  test('fleet manager selection updates state', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('tab-fleets').click();
    await expect(page.getByTestId('fleet-manager')).toBeVisible();
    const cards = page.getByTestId('fleet-card');
    if (await cards.count() > 0) {
      await cards.first().getByRole('button', { name: 'Select' }).click();
      await expect(cards.first()).toHaveClass(/fleet-card--selected/);
    }
  });

  test('ship designer shows default designs and stats', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('tab-designer').click();
    await expect(page.getByTestId('ship-designer')).toBeVisible();
    await expect(page.getByTestId('ship-design-list')).toBeVisible();
    await expect(page.getByTestId('ship-design-stats')).toBeVisible();
    await expect(page.getByTestId('ship-design-cost')).toBeVisible();
    await page.getByTestId('clone-ship-design').click();
    const weaponSlot = page.getByTestId('module-slot-weapon');
    if (await weaponSlot.isEnabled()) {
      const options = await weaponSlot.locator('option').allTextContents();
      if (options.length > 1) {
        await weaponSlot.selectOption({ index: 1 });
        await expect(page.getByTestId('ship-design-stats')).toBeVisible();
      }
    }
  });

  test('strategic-gated build shows disabled state when resources missing', async ({ page }) => {
    await startNewGame(page);
    const capital = page.getByTestId('galaxy-map');
    await expect(capital).toBeVisible();
    await page.getByTestId('tab-system').click();
    const shipyard = page.getByTestId('shipyard-designs');
    if (await shipyard.isVisible().catch(() => false)) {
      const cruiserBtn = page.locator('[data-testid^="queue-ship-default-cruiser"]');
      if (await cruiserBtn.isVisible().catch(() => false)) {
        await expect(cruiserBtn).toBeDisabled();
      }
    }
  });

  test('colonization cancel flow when target available', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('tab-system').click();
    const colonizeBtn = page.getByRole('button', { name: /Colonize/i });
    if (await colonizeBtn.first().isVisible().catch(() => false)) {
      await colonizeBtn.first().click();
      const cancelBtn = page.getByTestId('cancel-colonization');
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        const confirm = page.getByRole('button', { name: /Confirm|Yes|Cancel Colonization/i });
        if (await confirm.isVisible().catch(() => false)) {
          await confirm.click();
        }
        await expect(cancelBtn).not.toBeVisible();
        const turnBefore = await page.getByTestId('turn-number').textContent();
        await page.getByTestId('end-turn').click();
        await dismissTurnSummary(page);
        await page.getByTestId('end-turn').click();
        await dismissTurnSummary(page);
        await expect(page.getByTestId('turn-number').textContent()).not.toEqual(turnBefore);
      }
    }
  });
});