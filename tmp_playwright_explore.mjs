import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:8081';
const username = process.env.TEST_USERNAME || 'admin';
const password = process.env.TEST_PASSWORD || 'admin';
const result = {
  baseUrl,
  credentials: username,
  login: { ok: false, error: '' },
  aiEntry: { hasFixItFelix: false, hasAiTutorText: false, hasAgentStudioNav: false },
  agentStudio: { loaded: false, hasPromptStudio: false, savePromptWorked: false },
  ticketsToFelix: { clickedFelix: false, navigatedToAskAi: false, prefilledPromptDetected: false },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForFunction(() => !location.pathname.includes('/login'), { timeout: 20000 });
  result.login.ok = true;

  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  result.aiEntry.hasFixItFelix = bodyText.includes('fix it felix');
  result.aiEntry.hasAiTutorText = bodyText.includes('ai tutor');
  result.aiEntry.hasAgentStudioNav = bodyText.includes('agent studio');

  await page.goto(`${baseUrl}/ai-agents`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /ai agent studio/i }).waitFor({ timeout: 15000 });
  result.agentStudio.loaded = true;

  const studioText = (await page.locator('body').innerText()).toLowerCase();
  result.agentStudio.hasPromptStudio = studioText.includes('prompt studio');

  const systemPromptArea = page.locator('textarea').first();
  const existing = await systemPromptArea.inputValue();
  await systemPromptArea.fill(`${existing}\n\n# Playwright check marker`);
  await page.getByRole('button', { name: /save prompts/i }).click();

  try {
    await page.getByText(/prompts updated/i).waitFor({ timeout: 6000 });
    result.agentStudio.savePromptWorked = true;
  } catch {
    result.agentStudio.savePromptWorked = false;
  }

  await page.goto(`${baseUrl}/tickets`, { waitUntil: 'domcontentloaded' });
  const felixButton = page.getByRole('button', { name: /felix/i }).first();
  await felixButton.waitFor({ timeout: 15000 });
  await felixButton.click();
  result.ticketsToFelix.clickedFelix = true;

  await page.waitForURL(/\/ask-ai/, { timeout: 15000 });
  result.ticketsToFelix.navigatedToAskAi = page.url().includes('/ask-ai');

  const chatBox = page.locator('textarea').first();
  const chatValue = await chatBox.inputValue();
  result.ticketsToFelix.prefilledPromptDetected = chatValue.toLowerCase().includes('ticket');

  await page.screenshot({ path: '/tmp/cummins_playwright_explore.png', fullPage: true });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!result.login.ok) {
    result.login.error = message;
  } else {
    result.login.error = `Post-login error: ${message}`;
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
