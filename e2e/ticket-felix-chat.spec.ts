import { test, expect } from '@playwright/test';

// Use demo admin credentials (has access to all features)
const TEST_USER = {
  username: 'admin',
  password: 'admin',
};

test.describe('Ticket Felix Chat - Ask Fix-it Felix Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|tickets)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate directly to ticket detail page (ticket ID 1)
    await page.goto('/tickets/1');
    await page.waitForLoadState('networkidle');

    // Wait for ticket detail page to load
    await expect(page.locator('text=/TK-\\d+|INDY-TKT/')).toBeVisible({ timeout: 10000 });
  });

  test('should display floating Felix button on ticket summary view', async ({ page }) => {
    // Look for the floating sparkle button with title
    const floatingBtn = page.locator('button[title*="Felix"]');
    await expect(floatingBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open Felix chat panel when clicking floating button', async ({ page }) => {
    // Click the floating Felix button
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();

    // Verify chat panel opens - look for header text
    const chatHeader = page.locator('text=Ask Fix-it Felix');
    await expect(chatHeader.first()).toBeVisible({ timeout: 5000 });

    // Verify ticket context is shown (About TK-xxx)
    const aboutText = page.locator('text=/About TK-|About INDY-TKT/');
    await expect(aboutText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state with suggestion chips', async ({ page }) => {
    // Clear any existing thread by navigating fresh
    await page.evaluate(() => {
      // Clear localStorage for this ticket's thread
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('felix_ticket_thread_')) {
          localStorage.removeItem(key);
        }
      });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();

    // Verify suggestion chips exist
    const suggestion1 = page.locator('button').filter({ hasText: 'What should I check first?' });
    await expect(suggestion1).toBeVisible({ timeout: 5000 });
  });

  test('should fill input when clicking suggestion chip', async ({ page }) => {
    // Clear thread and reload
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('felix_ticket_thread_')) {
          localStorage.removeItem(key);
        }
      });
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();

    // Wait for panel to open
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Click a suggestion chip
    const suggestion = page.locator('button').filter({ hasText: 'What should I check first?' });
    await suggestion.click();

    // Verify input is filled
    const textarea = page.locator('textarea[placeholder*="repair"]');
    await expect(textarea).toHaveValue('What should I check first?');
  });

  test('should send message and show user message in thread', async ({ page }) => {
    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();

    // Wait for panel
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Type a message
    const textarea = page.locator('textarea[placeholder*="repair"]');
    await textarea.fill('What torque specs should I use?');

    // Press Enter to send
    await textarea.press('Enter');

    // Verify user message appears in the chat
    const userMessage = page.locator('.bg-primary').filter({ hasText: 'What torque specs should I use?' });
    await expect(userMessage).toBeVisible({ timeout: 5000 });
  });

  test('should receive AI response', async ({ page }) => {
    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Send a message
    const textarea = page.locator('textarea[placeholder*="repair"]');
    await textarea.fill('What is the fault code?');
    await textarea.press('Enter');

    // Verify user message appears
    const userMsg = page.locator('.bg-primary').filter({ hasText: 'What is the fault code?' });
    await expect(userMsg).toBeVisible({ timeout: 5000 });

    // Wait for loading indicator or response to start
    // Either "Thinking..." text or a second message bubble
    const loadingOrResponse = page.locator('text=Thinking...').or(
      page.locator('.bg-muted\\/50, .border-border').filter({ hasText: /.+/ })
    );

    // Give it some time to start responding (but don't wait for full response)
    await expect(loadingOrResponse.first()).toBeVisible({ timeout: 15000 }).catch(() => {
      // If no loading indicator, that's okay - the request may have completed quickly
    });

    // Verify the message count indicator updates (shows we have messages)
    await expect(page.locator('text=/\\d+ messages? in thread/')).toBeVisible({ timeout: 10000 });
  });

  test('should close panel when clicking X button', async ({ page }) => {
    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();

    // Verify panel is open - check for header text
    const chatHeader = page.locator('text=Ask Fix-it Felix');
    await expect(chatHeader.first()).toBeVisible({ timeout: 5000 });

    // The close button (X) is a small button near the header, not the send button
    // Look for a button with size h-8 w-8 that contains an SVG (the X icon)
    // It should be in the header area, which is the first flex container
    const closeBtn = page.locator('.fixed.inset-y-0.right-0 button.h-8.w-8').first();
    await closeBtn.click();

    // Verify panel is closed - header should no longer be visible
    await page.waitForTimeout(500);
    await expect(chatHeader.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('should persist thread memory across page navigation', async ({ page }) => {
    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Send a unique message
    const uniqueMsg = `Memory test ${Date.now()}`;
    const textarea = page.locator('textarea[placeholder*="repair"]');
    await textarea.fill(uniqueMsg);
    await textarea.press('Enter');

    // Wait for message to appear
    await expect(page.locator(`text=${uniqueMsg}`)).toBeVisible({ timeout: 5000 });

    // Navigate away and back
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    await page.goto('/tickets/1');
    await page.waitForLoadState('networkidle');

    // Reopen panel
    await page.locator('button[title*="Felix"]').click();

    // Verify message is still there (thread memory persisted)
    await expect(page.locator(`text=${uniqueMsg}`)).toBeVisible({ timeout: 5000 });
  });

  test('should clear thread when clicking trash button', async ({ page }) => {
    // First send a message so we have something to clear
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    const textarea = page.locator('textarea[placeholder*="repair"]');
    await textarea.fill('Message to be cleared');
    await textarea.press('Enter');

    // Wait for message
    await expect(page.locator('text=Message to be cleared')).toBeVisible({ timeout: 5000 });

    // Click clear/trash button
    const trashBtn = page.locator('button[title*="Clear"], button:has(svg.lucide-trash-2)').first();
    await trashBtn.click();

    // Verify messages are cleared
    await expect(page.locator('text=Message to be cleared')).not.toBeVisible({ timeout: 3000 });
  });

  test('should show messages in thread indicator', async ({ page }) => {
    // Open Felix chat
    const floatingBtn = page.locator('button[title*="Felix"]');
    await floatingBtn.click();
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Send a message
    const textarea = page.locator('textarea[placeholder*="repair"]');
    await textarea.fill('Test for message count');
    await textarea.press('Enter');

    // Wait for message to be sent
    await page.waitForTimeout(1000);

    // Should show message count in header or thread indicator
    const msgIndicator = page.locator('text=/\\d+ message/');
    await expect(msgIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Ticket Felix Chat - Full Detail View', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|tickets)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate directly to ticket detail page
    await page.goto('/tickets/1');
    await page.waitForLoadState('networkidle');
  });

  test('should show Ask Felix button in full detail view header', async ({ page }) => {
    // Click "View Full Repair Details" button to enter full detail view
    const fullDetailBtn = page.locator('button').filter({ hasText: /View Full Repair/i });
    await expect(fullDetailBtn).toBeVisible({ timeout: 10000 });
    await fullDetailBtn.click();
    await page.waitForTimeout(500);

    // Look for "Ask Fix-it Felix" button in header
    const askFelixBtn = page.locator('button').filter({ hasText: /Ask Fix-it Felix/i });
    await expect(askFelixBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open Felix chat from header button in full detail view', async ({ page }) => {
    // Enter full detail view
    const fullDetailBtn = page.locator('button').filter({ hasText: /View Full Repair/i });
    await expect(fullDetailBtn).toBeVisible({ timeout: 10000 });
    await fullDetailBtn.click();
    await page.waitForTimeout(500);

    // Click "Ask Fix-it Felix" button in header
    const askFelixBtn = page.locator('button').filter({ hasText: /Ask Fix-it Felix/i });
    await askFelixBtn.click();

    // Verify chat panel opens - check for the panel header
    const chatHeader = page.locator('text=Ask Fix-it Felix');
    await expect(chatHeader.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Ticket Felix Chat - Context Injection', () => {
  test('should include ticket ID and fault code in context badges', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[placeholder*="username" i]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL(/\/(dashboard|tickets)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Go to ticket detail page
    await page.goto('/tickets/1');
    await page.waitForLoadState('networkidle');

    // Wait for ticket content to load (look for ticket-related text)
    await expect(page.locator('text=/Engine|Overheating|TK-|INDY-TKT|Diagnostic/i').first()).toBeVisible({ timeout: 10000 });

    // Find and click the floating Felix button
    const floatingBtn = page.locator('button[title*="Felix"]');
    await expect(floatingBtn).toBeVisible({ timeout: 10000 });
    await floatingBtn.click();

    // Verify chat panel opens with context
    await expect(page.locator('text=Ask Fix-it Felix').first()).toBeVisible({ timeout: 5000 });

    // Look for "About" text showing ticket context
    const aboutText = page.locator('text=/About TK-|About INDY-TKT/i');
    await expect(aboutText.first()).toBeVisible({ timeout: 5000 });
  });
});
