const { chromium, devices } = require('playwright');
// Full flow against emulators. Needs: npm run build:emu && npm run emulators (other terminal).
// Usage: node tests/e2e.cjs [screenshot-dir]
const fs = require('fs');
const OUT = process.argv[2] || 'test-results';
fs.mkdirSync(OUT, { recursive: true });
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); console.log('ok -', m); };
const BASE = 'http://127.0.0.1:5000';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['Pixel 7'], geolocation: { latitude: 41.8781, longitude: -87.6298 }, permissions: ['geolocation'] });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto(BASE);
  await p.screenshot({ path: OUT + '/1-login.png' });
  await p.waitForSelector('text=Continue with Google');
  await p.evaluate(() => window.__testSignIn('sam' + Date.now()));
  await p.waitForSelector('text=What should we call you?');
  await p.fill('input[placeholder="First name"]', 'Sam');
  await p.screenshot({ path: OUT + '/2-onboard.png' });
  await p.click('text=Let\'s go');
  await p.waitForSelector('text=+ Log');
  await p.screenshot({ path: OUT + '/3-home-empty.png' });

  // Log 1: new place
  await p.click('text=+ Log');
  await p.waitForSelector('text=New spot?');
  await p.fill('input[placeholder^="e.g."]', 'Home');
  await p.click('.chip:has-text("Vape")');
  await p.click('.chip:has-text("Mellow")');
  await p.click('.chip:has-text("Boredom")');
  await p.click('text=+ More details');
  await p.fill('textarea', 'SECRET-NOTE');
  await p.screenshot({ path: OUT + '/4-log-sheet.png', fullPage: false });
  await p.click('.sheet-actions .btn.primary');
  await p.waitForSelector('.toast');
  await p.screenshot({ path: OUT + '/5-toast.png' });

  // Log 2: should auto-match Home
  await p.click('text=+ Log');
  await p.waitForFunction(() => document.querySelector('.chip.on')?.textContent?.includes('Home'), null, { timeout: 10000 });
  assert(true, 'auto-matched saved place');
  await p.click('.chip:has-text("Flower")');
  await p.click('.chip:has-text("Deep Space")');
  await p.click('.chip:has-text("Social")');
  await p.click('.chip:has-text("Stress")');
  await p.click('.sheet-actions .btn.primary');

  // Urge skipped
  await p.click('text=Skipped an urge');
  await p.click('.chip:has-text("Boredom")');
  await p.click('.sheet-actions .btn.primary');
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/6-home.png', fullPage: true });

  await p.click('.tabs >> text=Stats');
  await p.waitForSelector('canvas');
  await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '/7-stats.png', fullPage: true });

  await p.click('.tabs >> text=History');
  await p.screenshot({ path: OUT + '/8-history.png' });

  await p.click('.tabs >> text=Settings');
  await p.click('text=Create share link');
  const code = await p.waitForSelector('.share-url code');
  const url = await code.textContent();
  console.log('share url', url);
  await p.click('label:has-text("Show places") input');
  await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/9-settings.png', fullPage: true });

  const viewer = await b.newContext({ ...devices['iPhone 14'] });
  const v = await viewer.newPage();
  const token = url.split('/s/')[1];
  const api = await v.request.get(`${BASE}/api/share/${token}`);
  const body = await api.text();
  assert(api.status() === 200, 'share API 200');
  assert(!body.includes('SECRET'), 'notes never shared');
  assert(!body.includes('41.87'), 'coordinates never shared');
  assert(!body.includes('Home'), 'places hidden when toggled off');
  await v.goto(url);
  await v.waitForSelector('text=Shared by Sam');
  await v.waitForTimeout(600);
  await v.screenshot({ path: OUT + '/10-shared.png', fullPage: true });

  p.on('dialog', (d) => { console.log('dialog:', d.message()); d.accept(); });
  await p.click('button:has-text("New link")'); console.log('clicked new link');
  await p.waitForTimeout(3000); console.log('after rotate:', await p.textContent('.share-url code').catch(()=>'none')); await p.screenshot({ path: OUT + '/11-rotate.png' });
  const old = await v.request.get(`${BASE}/api/share/${token}`);
  assert(old.status() === 404, 'old link dead after rotate');
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
