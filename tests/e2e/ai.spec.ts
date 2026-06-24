import { test, expect } from '@playwright/test';

test.describe('PersonaForge AI & Agentic Systems E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Authentication flow
    await page.goto('/login');
    await page.getByRole('button', { name: /Admin/i }).click();
    await expect(page.getByText('PersonaForge', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should execute RAG chat in AI Copilot', async ({ page }) => {
    // Navigate to AI Copilot
    await page.getByRole('button', { name: 'AI Copilot', exact: false }).first().click();
    await expect(page.getByRole('heading', { name: 'AI Copilot' })).toBeVisible();

    // Type a question
    const chatInput = page.getByPlaceholder('Ask about your users, personas, campaigns...');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('What is the conversion rate for tech enthusiasts?');
    await chatInput.press('Enter');

    // Wait for the response (we assume the system replies with "PersonaForge Insights" or something similar)
    // The response should appear in the chat log. We look for the last message not being empty.
    const lastMessage = page.locator('.message').last(); // Might need adjusting based on exact classes
    // We can just wait for the submit button to stop spinning or wait for text.
    await expect(page.getByText('PersonaForge Insights', { exact: false }).or(page.getByText('total users tracked', { exact: false }))).toBeVisible({ timeout: 15000 });
  });

  test('should trigger and run the Agent Console Demo', async ({ page }) => {
    // Navigate to Agent Console
    await page.getByRole('button', { name: 'Agent Console', exact: false }).first().click();
    await expect(page.getByRole('heading', { name: 'Agent Console' })).toBeVisible();

    // Click "Run Demo Analysis"
    const runDemoButton = page.getByRole('button', { name: 'Run Demo Analysis', exact: false });
    await expect(runDemoButton).toBeVisible();
    await runDemoButton.click();

    // The button changes to "Running Agent Chain..."
    await expect(page.getByText('Running Agent Chain...', { exact: false })).toBeVisible();

    // Wait for completion (this might take up to 20 seconds depending on API)
    // We check for the "Agent Chain Execution" title which appears when the run is selected
    await expect(page.getByText('Agent Chain Execution', { exact: true }).first()).toBeVisible({ timeout: 30000 });

    // Ensure the trace shows multiple agents
    await expect(page.getByText('Supervisor', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('PersonaClassifier', { exact: false }).first()).toBeVisible();

    // Ensure Final Recommendation appears
    await expect(page.getByText('Final Recommendation', { exact: false })).toBeVisible();
  });
});
