import { test, expect } from '@playwright/test';

test('boots, ends turn, and opens fleet manager', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('menu-title')).toHaveText('Endless Grok', { timeout: 15000 });
  await page.getByTestId('new-game').click();

  const confirm = page.getByRole('button', { name: 'Start New Game' });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }

  await expect(page.getByTestId('galaxy-map')).toBeVisible();
  await expect(page.getByTestId('resource-bar')).toBeVisible();
  await expect(page.getByTestId('turn-counter')).toBeVisible();
  await expect(page.getByTestId('end-turn')).toBeVisible();

  const turnBefore = await page.getByTestId('turn-number').textContent();
  await page.getByTestId('end-turn').click();

  await expect(page.getByTestId('turn-number')).not.toHaveText(turnBefore ?? '');

  const continueBtn = page.getByRole('button', { name: 'Continue' });
  if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueBtn.click();
  }

  const decision = page.locator('.decision-overlay button').first();
  if (await decision.isVisible({ timeout: 2000 }).catch(() => false)) {
    await decision.click();
  }

  await page.getByTestId('tab-fleets').click();
  await expect(page.getByTestId('fleet-manager')).toBeVisible();

  const fleetCards = page.getByTestId('fleet-card');
  const emptyState = page.getByTestId('fleet-manager-empty');
  const hasCards = await fleetCards.count();
  if (hasCards > 0) {
    await expect(fleetCards.first()).toBeVisible();
  } else {
    await expect(emptyState).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});