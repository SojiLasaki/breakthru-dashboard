import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
const username = process.env.TEST_USERNAME || 'adminplay';
const password = process.env.TEST_PASSWORD || 'adminplay';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('#username', username);
await page.fill('#password', password);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForFunction(() => !location.pathname.includes('/login'));

await page.goto(`${baseUrl}/tickets`, { waitUntil: 'domcontentloaded' });
const felixButton = page.getByRole('button', { name: /felix/i }).first();
await felixButton.click();
await page.waitForURL(/\/ask-ai/);
await page.waitForTimeout(1000);

const url = page.url();
const textareas = page.locator('textarea');
const count = await textareas.count();
const values = [];
for (let i = 0; i < count; i++) {
  const value = await textareas.nth(i).inputValue();
  values.push({ index: i, value: value.slice(0, 200) });
}

const askBox = page.locator('textarea[placeholder*="Ask Fix-it Felix anything"]');
let askValue = '';
if (await askBox.count()) {
  askValue = await askBox.first().inputValue();
}

console.log(JSON.stringify({ url, textareaCount: count, values, askValue: askValue.slice(0, 300) }, null, 2));
await browser.close();
