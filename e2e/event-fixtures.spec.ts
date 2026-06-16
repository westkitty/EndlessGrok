import { test, expect } from '@playwright/test';
import starbindingFixtures from '../tests/fixtures/events/starbinding.json' with { type: 'json' };
import macrosFixtures from '../tests/fixtures/events/macros.json' with { type: 'json' };
import victoryFixtures from '../tests/fixtures/events/victory.json' with { type: 'json' };
import type { EventDefinition } from '../src/data/events/eventDefinitionTypes';

const starbindingEvents = starbindingFixtures as EventDefinition[];
const macroEvents = macrosFixtures as EventDefinition[];
const victoryEvents = victoryFixtures as EventDefinition[];

async function startNewGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('menu-title')).toHaveText('Endless Grok', { timeout: 15000 });
  await page.getByTestId('new-game').click();
  const confirm = page.getByRole('button', { name: 'Start New Game' });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
  await expect(page.getByTestId('galaxy-map')).toBeVisible({ timeout: 20000 });
}

test.describe('Deterministic event fixtures', () => {
  test('event log renders seeded Starbinding warning event', async ({ page }) => {
    await startNewGame(page);
    const warning = starbindingEvents.find(e => e.id === 'event-victory-heliocide-confirmation');
    expect(warning).toBeDefined();

    await page.evaluate((eventId) => {
      (window as Window & { __egSeedEvent?: (id: string) => void }).__egSeedEvent?.(eventId);
    }, warning!.id);

    await expect(page.getByTestId(`event-log-${warning!.id}`)).toBeVisible({ timeout: 5000 });
  });

  test('event log renders seeded macro event', async ({ page }) => {
    await startNewGame(page);
    const macroEvent = macroEvents.find(e => e.id === 'event-macro-syrin-inerting-mist-executed');
    expect(macroEvent).toBeDefined();

    await page.evaluate((eventId) => {
      (window as Window & { __egSeedEvent?: (id: string) => void }).__egSeedEvent?.(eventId);
    }, macroEvent!.id);

    await expect(page.getByTestId(`event-log-${macroEvent!.id}`)).toBeVisible({ timeout: 5000 });
  });

  test('victory progress fixture event appears in log', async ({ page }) => {
    await startNewGame(page);
    const victoryEvent = victoryEvents.find(e => e.id === 'event-victory-rival-starbinding-threshold');
    expect(victoryEvent).toBeDefined();

    await page.evaluate((eventId) => {
      (window as Window & { __egSeedEvent?: (id: string) => void }).__egSeedEvent?.(eventId);
    }, victoryEvent!.id);

    await expect(page.getByTestId(`event-log-${victoryEvent!.id}`)).toBeVisible({ timeout: 5000 });
  });
});