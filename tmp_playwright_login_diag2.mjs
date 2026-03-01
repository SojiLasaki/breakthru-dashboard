import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8081';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const requestFailed = [];
const requestFinished = [];
const consoleMsgs = [];

page.on('requestfailed', req => requestFailed.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || 'unknown' }));
page.on('requestfinished', req => {
  if (req.url().includes('/api/')) requestFinished.push({ url: req.url(), method: req.method() });
});
page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));

await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.fill('#username', 'admin');
await page.fill('#password', 'admin');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForTimeout(5000);

console.log(JSON.stringify({
  url: page.url(),
  requestFinished,
  requestFailed,
  consoleMsgs,
}, null, 2));

await browser.close();
