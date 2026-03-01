import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const apiResponses = [];
page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('/api/auth/login')) {
    let body = '';
    try { body = await resp.text(); } catch {}
    apiResponses.push({ url, status: resp.status(), body: body.slice(0, 500) });
  }
});

await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.fill('#username', 'admin');
await page.fill('#password', 'admin');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForTimeout(5000);

const url = page.url();
const bodyText = await page.locator('body').innerText();
const alertText = await page.locator('[role="alert"]').allTextContents().catch(() => []);

console.log(JSON.stringify({ url, alertText, apiResponses, bodySnippet: bodyText.slice(0, 800) }, null, 2));
await browser.close();
