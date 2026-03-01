import { firefox } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:8081';

const browser = await firefox.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const seen = [];
page.on('response', async (resp) => {
  const url = resp.url();
  if (url.includes('/api/ai/mcp_adapters') || url.includes('/api/ai/model_endpoints')) {
    seen.push({ url, status: resp.status() });
  }
});

await page.goto(`${baseUrl}/login`);
await page.getByRole('button', { name: 'admin' }).click();
await page.getByRole('button', { name: 'Sign In' }).click();
await page.waitForURL(`${baseUrl}/`);

await page.goto(`${baseUrl}/ai-agents?tab=integrations`);
await page.waitForTimeout(1200);

const accessLen = await page.evaluate(() => (localStorage.getItem('access') || '').length);
const hasNoAdapters = await page.getByText('No MCP adapters yet').count();
const bodyText = await page.textContent('body');

const data = await page.evaluate(async () => {
  const token = localStorage.getItem('access') || '';
  const r = await fetch('http://localhost:8000/api/ai/mcp_adapters/', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const t = await r.text();
  return { status: r.status, snippet: t.slice(0, 220) };
});

console.log(JSON.stringify({
  baseUrl,
  accessLen,
  hasNoAdapters,
  seen,
  hasConfiguredHeader: (bodyText || '').includes('Configured MCP Adapters'),
  hasPlaywrightAdapter: (bodyText || '').includes('Playwright MCP') || (bodyText || '').includes('playwright-localhost-mcp'),
  directFetch: data,
}, null, 2));

await browser.close();
