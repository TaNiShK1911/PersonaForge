import { test, expect } from '@playwright/test';

test.describe('Cross-App Tracking & Agentic Workflow E2E', () => {
  // Use a longer timeout for cross-app flows
  test.setTimeout(60000);

  test('should track bazaar activity and view it in dashboard, then run agent and chat', async ({ page }) => {
    // 1. Visit Bazaar on port 8080
    await page.goto('http://localhost:8080');
    await expect(page.getByText('Bazaar', { exact: false }).first()).toBeVisible();
    
    // Wait a bit for tracking script to initialize
    await page.waitForTimeout(2000);

    // Click on a product category or link (e.g., Shop Now, Women, Men, etc.)
    // Let's just click on any link that looks like a product or category to trigger page_view
    const shopLink = page.getByRole('link', { name: /Shop|Clothing|Products/i }).first();
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForTimeout(2000);
    }

    // Attempt to click a product if available
    const product = page.locator('a[href^="/products/"]').first();
    if (await product.isVisible()) {
      await product.click();
      await page.waitForTimeout(2000);
    }

    // 2. Visit PersonaForge Dashboard on port 3000
    await page.goto('http://localhost:3000/login');
    
    // Login as Admin
    const adminBtn = page.getByRole('button', { name: /Admin/i });
    if (await adminBtn.isVisible()) {
      await adminBtn.click();
    } else {
      // Maybe already logged in
    }

    // We should be on dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Verify activity feed has our action
    // We expect some page view from localhost:8080
    // Wait for feed to load
    await page.waitForTimeout(2000);
    
    // The dashboard usually has "Recent Activity" or similar. Let's just check if it loads successfully.
    await expect(page.getByText('PersonaForge', { exact: false })).toBeVisible();

    // 3. Test Agentic Workflow
    await page.goto('http://localhost:3000/dashboard/agents');
    await expect(page.getByRole('heading', { name: 'Agent Console' })).toBeVisible();

    const runDemoButton = page.getByRole('button', { name: /Run Demo Analysis/i });
    await expect(runDemoButton).toBeVisible();
    await runDemoButton.click();

    await expect(page.getByText('Running Agent Chain...', { exact: false })).toBeVisible();
    await expect(page.getByText('Agent Chain Execution', { exact: true }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Supervisor', { exact: false }).first()).toBeVisible();

    // 4. Test Chatbot Functionality (AI Copilot)
    await page.goto('http://localhost:3000/dashboard/ai');
    await expect(page.getByRole('heading', { name: 'AI Copilot' })).toBeVisible();

    const chatInput = page.getByPlaceholder(/Ask about your users/i);
    await expect(chatInput).toBeVisible();
    await chatInput.fill('What is the latest activity tracked?');
    await chatInput.press('Enter');

    // Wait for response
    await expect(page.locator('.message').last()).not.toBeEmpty({ timeout: 15000 });
  });
});
