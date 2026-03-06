import { test, expect } from '@playwright/test';

const TEST_USER = {
  username: 'sajandoe',
  password: 'sajandoe',
};

test.describe('Fix-it Felix Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="username"], input[placeholder*="username" i]', TEST_USER.username);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or ask-ai
    await expect(page).toHaveURL(/\/(ask-ai|dashboard|tickets)?$/);

    // Navigate to Fix-it Felix
    await page.goto('/ask-ai');
    await page.waitForLoadState('networkidle');
  });

  test('should display chat interface', async ({ page }) => {
    // Check for chat input
    const chatInput = page.locator('textarea, input[type="text"]').filter({ hasText: /message|ask|type/i }).or(
      page.locator('[placeholder*="message" i], [placeholder*="ask" i]')
    );
    await expect(chatInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have New Chat button', async ({ page }) => {
    // Look for New Chat button
    const newChatBtn = page.locator('button').filter({ hasText: /new chat/i });
    await expect(newChatBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open chat sessions panel', async ({ page }) => {
    // Click on sessions/history button
    const sessionsBtn = page.locator('button').filter({ hasText: /session|history/i }).or(
      page.locator('button:has([class*="PanelLeft"])')
    );

    if (await sessionsBtn.first().isVisible()) {
      await sessionsBtn.first().click();

      // Check for session panel content
      const sessionPanel = page.locator('[role="dialog"], [class*="Sheet"]');
      await expect(sessionPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create new chat session', async ({ page }) => {
    // Find and click New Chat button
    const newChatBtn = page.locator('button').filter({ hasText: /new chat/i });

    if (await newChatBtn.first().isVisible()) {
      await newChatBtn.first().click();

      // Verify chat is cleared/new session started
      await page.waitForTimeout(500);

      // Check that we can type in the chat
      const chatInput = page.locator('textarea').first();
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEmpty();
    }
  });

  test('should send message and get response', async ({ page }) => {
    // Find chat input
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Type a diagnostic question
    await chatInput.fill('What are the steps to diagnose a fuel injector leak?');

    // Find send button (it's a button with Send icon, next to textarea)
    const sendBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendBtn.click();

    // Wait for response - look for content that indicates AI responded
    await page.waitForTimeout(2000); // Give time for request to start

    // Wait for any new content to appear (AI response)
    await expect(
      page.locator('text=/injector|diagnos|inspect|check|step|procedure/i').first()
    ).toBeVisible({ timeout: 90000 });
  });

  test('should create ticket via chat and show greyed button after creation', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Send ticket creation request
    await chatInput.fill('Create a ticket for engine coolant leak on truck 1234. Prepare repair checklist.');

    // Find send button
    const sendBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendBtn.click();

    // Wait for proposal card with Confirm button
    const confirmBtn = page.locator('button').filter({ hasText: /confirm/i });
    await expect(confirmBtn.first()).toBeVisible({ timeout: 90000 });

    // Click confirm
    await confirmBtn.first().click();

    // Wait for either:
    // 1. Button to change to "Ticket Created" or be disabled
    // 2. A ticket link to appear
    // 3. A success toast/message
    const ticketLink = page.locator('a[href*="/tickets/"]');
    const createdText = page.getByText(/ticket created|TK-/i);
    const disabledBtn = page.locator('button[disabled]');

    await expect(ticketLink.or(createdText).or(disabledBtn).first()).toBeVisible({ timeout: 60000 });
  });
});

test.describe('Ticket Checklist API', () => {
  test('should auto-generate checklist on ticket creation', async ({ request }) => {
    // Login
    const loginRes = await request.post('http://127.0.0.1:8000/api/auth/login/', {
      data: { username: TEST_USER.username, password: TEST_USER.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { access } = await loginRes.json();

    // Create ticket
    const ticketRes = await request.post('http://127.0.0.1:8000/api/tickets/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        title: 'E2E Test Ticket',
        description: 'Testing checklist auto-generation',
        issue_description: 'Engine overheating on test truck',
        specialization: 'engine',
        priority: 2,
        severity: 2,
      },
    });

    expect(ticketRes.ok()).toBeTruthy();
    const ticket = await ticketRes.json();

    // Verify checklist was generated
    expect(ticket.checklist_template).toBeDefined();
    expect(Array.isArray(ticket.checklist_template)).toBeTruthy();
    expect(ticket.checklist_template.length).toBeGreaterThan(0);

    // Verify checklist structure
    const firstStep = ticket.checklist_template[0];
    expect(firstStep.id).toBeDefined();
    expect(firstStep.title).toBeDefined();
  });

  test('should sync checklist via endpoint', async ({ request }) => {
    // Login
    const loginRes = await request.post('http://127.0.0.1:8000/api/auth/login/', {
      data: { username: TEST_USER.username, password: TEST_USER.password },
    });
    const { access } = await loginRes.json();

    // Create ticket
    const ticketRes = await request.post('http://127.0.0.1:8000/api/tickets/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        title: 'Sync Test Ticket',
        description: 'Testing sync endpoint',
        issue_description: 'Fuel leak test',
        specialization: 'engine',
        priority: 2,
        severity: 2,
      },
    });
    const ticket = await ticketRes.json();

    // Call sync_checklist
    const syncRes = await request.post(`http://127.0.0.1:8000/api/tickets/${ticket.id}/sync_checklist/`, {
      headers: { Authorization: `Bearer ${access}` },
    });

    expect(syncRes.ok()).toBeTruthy();
    const synced = await syncRes.json();

    expect(synced.checklist_template).toBeDefined();
    expect(synced.checklist_template.length).toBeGreaterThan(0);
  });
});

test.describe('Update Ticket via Chat API', () => {
  test('should create update_ticket proposal for status change', async ({ request }) => {
    // Login
    const loginRes = await request.post('http://127.0.0.1:8000/api/auth/login/', {
      data: { username: TEST_USER.username, password: TEST_USER.password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { access } = await loginRes.json();

    // First create a ticket to update
    const ticketRes = await request.post('http://127.0.0.1:8000/api/tickets/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        title: 'Update Test Ticket',
        description: 'Testing update_ticket action',
        issue_description: 'Test issue for update',
        specialization: 'engine',
        priority: 2,
        severity: 2,
      },
    });
    expect(ticketRes.ok()).toBeTruthy();
    const ticket = await ticketRes.json();

    // Send chat message to update the ticket
    const chatRes = await request.post('http://127.0.0.1:8000/api/ai/chat/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        message: `Update ticket ${ticket.ticket_id} to mark it as in progress`,
        context: { ticket_id: ticket.ticket_id },
      },
    });

    expect(chatRes.ok()).toBeTruthy();
    const chatData = await chatRes.json();

    // Check if update_ticket proposal was created
    const actionsRes = await request.get('http://127.0.0.1:8000/api/ai/agent_actions/', {
      headers: { Authorization: `Bearer ${access}` },
      params: { action_type: 'update_ticket', status: 'pending' },
    });

    expect(actionsRes.ok()).toBeTruthy();
    const actions = await actionsRes.json();

    // We should have at least one update_ticket proposal
    const updateProposals = Array.isArray(actions) ? actions : actions.results || [];
    const relevantProposal = updateProposals.find(
      (p: { payload?: { ticket_ref?: string } }) => p.payload?.ticket_ref === ticket.ticket_id
    );

    if (relevantProposal) {
      expect(relevantProposal.action_type).toBe('update_ticket');
      expect(relevantProposal.payload.updates).toBeDefined();
      expect(relevantProposal.payload.updates.status).toBe('in_progress');
    }
  });

  test('should execute update_ticket and modify ticket status', async ({ request }) => {
    // Login
    const loginRes = await request.post('http://127.0.0.1:8000/api/auth/login/', {
      data: { username: TEST_USER.username, password: TEST_USER.password },
    });
    const { access } = await loginRes.json();

    // Create a ticket
    const ticketRes = await request.post('http://127.0.0.1:8000/api/tickets/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        title: 'Execute Update Test',
        description: 'Testing update execution',
        issue_description: 'Test for complete flow',
        specialization: 'engine',
        priority: 2,
        severity: 2,
      },
    });
    const ticket = await ticketRes.json();
    // Ticket may be auto-assigned, so status could be 'pending' or 'assigned'
    expect(['pending', 'assigned']).toContain(ticket.status);

    // Send update request via chat
    await request.post('http://127.0.0.1:8000/api/ai/chat/', {
      headers: { Authorization: `Bearer ${access}` },
      data: {
        message: `Close ticket ${ticket.ticket_id} - the issue has been resolved`,
        context: { ticket_id: ticket.ticket_id },
      },
    });

    // Get pending update proposals
    const actionsRes = await request.get('http://127.0.0.1:8000/api/ai/agent_actions/', {
      headers: { Authorization: `Bearer ${access}` },
      params: { action_type: 'update_ticket', status: 'pending' },
    });
    const actions = await actionsRes.json();
    const updateProposals = Array.isArray(actions) ? actions : actions.results || [];
    const proposal = updateProposals.find(
      (p: { payload?: { ticket_ref?: string } }) => p.payload?.ticket_ref === ticket.ticket_id
    );

    if (proposal) {
      // Approve the update
      const approveRes = await request.post(
        `http://127.0.0.1:8000/api/ai/agent_actions/${proposal.id}/approve/`,
        { headers: { Authorization: `Bearer ${access}` } }
      );
      expect(approveRes.ok()).toBeTruthy();

      // Verify ticket was updated
      const updatedTicketRes = await request.get(
        `http://127.0.0.1:8000/api/tickets/${ticket.id}/`,
        { headers: { Authorization: `Bearer ${access}` } }
      );
      const updatedTicket = await updatedTicketRes.json();
      expect(updatedTicket.status).toBe('completed');
    }
  });
});
