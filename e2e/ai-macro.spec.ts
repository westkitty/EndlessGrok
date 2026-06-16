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

async function dismissTurnSummary(page: import('@playwright/test').Page) {
  const overlay = page.locator('.overlay');
  for (let attempt = 0; attempt < 8; attempt++) {
    if (!(await overlay.first().isVisible().catch(() => false))) return;

    const decision = page.locator('.decision-overlay button').first();
    if (await decision.isVisible().catch(() => false)) {
      await decision.click({ force: true });
      await expect(overlay.first()).toBeHidden({ timeout: 10000 }).catch(() => {});
      continue;
    }

    const continueBtn = page.getByRole('button', { name: 'Continue' });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click({ force: true });
      await expect(overlay.first()).toBeHidden({ timeout: 10000 }).catch(() => {});
      continue;
    }

    await page.keyboard.press('Escape');
  }
}

async function prepareMacroPanel(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    (window as Window & { __egPrepareMacroTest?: () => void }).__egPrepareMacroTest?.();
  });
}

test.describe('AI and macro systems UI', () => {
  test('victory panel shows foundation paths', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('tab-empire').click();
    await expect(page.getByTestId('victory-panel')).toBeVisible();
    await expect(page.getByTestId('victory-path-starbinding')).toBeVisible();
    await expect(page.getByTestId('victory-badge-starbinding')).toHaveText('Implemented');
    await expect(page.getByTestId('victory-path-ledgerDominion')).toBeVisible();
    await expect(page.getByTestId('victory-badge-ledgerDominion')).toHaveText('Locked');
  });

  test('macro panel shows active effect after execute', async ({ page }) => {
    await startNewGame(page);
    await prepareMacroPanel(page);
    await page.getByTestId('tab-system').click();
    await expect(page.getByTestId('macro-panel')).toBeVisible({ timeout: 10000 });
    const executeBtn = page.getByTestId('execute-macro-local_checksum_audit');
    await expect(executeBtn).toBeEnabled({ timeout: 5000 });
    await executeBtn.click();
    await expect(page.getByTestId('active-macro-effects')).toBeVisible();
    await expect(page.getByTestId('active-macro-local_checksum_audit')).toBeVisible();
    await expect(page.getByTestId('system-active-macros')).toBeVisible();
  });

  test('end turn decrements macro effect duration', async ({ page }) => {
    await startNewGame(page);
    await prepareMacroPanel(page);
    await page.getByTestId('tab-system').click();
    await expect(page.getByTestId('macro-panel')).toBeVisible({ timeout: 10000 });
    const executeBtn = page.getByTestId('execute-macro-local_checksum_audit');
    await expect(executeBtn).toBeEnabled({ timeout: 10000 });
    await executeBtn.click();
    await expect(page.getByTestId('active-macro-local_checksum_audit')).toContainText('3 turns');
    await page.getByTestId('end-turn').click();
    await dismissTurnSummary(page);
    await expect(page.getByTestId('active-macro-local_checksum_audit')).toContainText('2 turns', { timeout: 10000 });
  });

  test('starbinding threat produces diplomatic warning after end turn', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      (window as Window & { __egSimulateStarbindingThreat?: () => void }).__egSimulateStarbindingThreat?.();
    });
    await page.getByTestId('end-turn').click();
    await dismissTurnSummary(page);
    const eventLog = page.locator('.event-log');
    await expect(eventLog.first()).toBeVisible({ timeout: 5000 });
    await expect(eventLog.first()).toContainText(
      /Starbinding|ultimatum|weaponization|Partition|containment|preservation|hostile/i,
      { timeout: 10000 },
    );
  });
});