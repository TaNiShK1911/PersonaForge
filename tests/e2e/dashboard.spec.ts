import { test, expect } from '@playwright/test';

test.describe('PersonaForge Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Authentication flow
    await page.goto('/login');
    // Click the Admin login button
    await page.getByRole('button', { name: /Admin/i }).click();
    
    // Wait for the dashboard to load
    await expect(page.getByText('PersonaForge', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should navigate through all 8 dashboard views without errors', async ({ page }) => {
    // We expect to start on the Overview view
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    // Iterate through all views using the sidebar navigation
    const views = [
      'User Explorer',
      'Persona Studio',
      'Causal Analysis',
      'Counterfactual Lab',
      'Personalization',
      'Explainability',
      'Bandit Optimizer'
    ];

    for (const view of views) {
      await page.getByRole('button', { name: view, exact: false }).first().click();
      await expect(page.getByRole('heading', { name: view, exact: false })).toBeVisible();
    }
  });

  test('should toggle treatments in the Counterfactual Lab', async ({ page }) => {
    // Navigate to Counterfactual Lab
    await page.getByRole('button', { name: 'Counterfactual Lab', exact: false }).first().click();
    await expect(page.getByRole('heading', { name: 'Counterfactual Lab' })).toBeVisible();

    const discountSwitch = page.getByRole('switch').nth(0);
    const socialProofSwitch = page.getByRole('switch').nth(1);

    await discountSwitch.click();
    await socialProofSwitch.click();

    await expect(page.getByText('Predicted Conversion', { exact: true })).toBeVisible();
  });

  test('should interact with the Bandit Optimizer (+50 pulls)', async ({ page }) => {
    // Navigate to Bandit Optimizer
    await page.getByRole('button', { name: 'Bandit Optimizer', exact: false }).first().click();
    await expect(page.getByRole('heading', { name: 'Bandit Optimizer' })).toBeVisible();

    const fastForwardButton = page.getByRole('button', { name: '+50' });
    await expect(fastForwardButton).toBeVisible();

    const totalRoundsLocator = page.locator('div').filter({ hasText: /^Total Rounds$/ }).locator('..').locator('.text-2xl, .text-3xl');
    const initialRoundsText = await totalRoundsLocator.textContent();
    const initialRounds = parseInt(initialRoundsText || '0', 10);

    await fastForwardButton.click();

    await expect(async () => {
      const newRoundsText = await totalRoundsLocator.textContent();
      const newRounds = parseInt(newRoundsText || '0', 10);
      expect(newRounds).toBeGreaterThan(initialRounds);
    }).toPass();
  });
});
