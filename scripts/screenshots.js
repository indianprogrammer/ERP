// Captures screenshots of all ERP modules using system Chrome via puppeteer-core
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'screenshots');
const CHROME = process.env.CHROME_PATH || '/opt/X3M/chrome/chrome';

const pages = [
  { name: '01-dashboard', hash: '#/dashboard', wait: 1500 },
  { name: '02-procurement-quote-matrix', hash: '#/procurement?tab=quotes&rfq=1', wait: 1800 },
  { name: '03-procurement-pos', hash: '#/procurement?tab=pos', wait: 1500 },
  { name: '04-procurement-warranties', hash: '#/procurement?tab=warranties', wait: 1500 },
  { name: '05-sales-billing', hash: '#/sales?tab=docs', wait: 1500 },
  { name: '06-sales-customers', hash: '#/sales?tab=customers', wait: 1200 },
  { name: '07-sales-receivables', hash: '#/sales?tab=receivables', wait: 1200 },
  { name: '08-inventory-stock', hash: '#/inventory?tab=stock', wait: 1500 },
  { name: '09-inventory-items', hash: '#/inventory?tab=items', wait: 1200 },
  { name: '10-crm-kanban', hash: '#/crm', wait: 1500 },
  { name: '11-projects', hash: '#/projects', wait: 1500 },
  { name: '12-gst-reconciliation', hash: '#/gst', wait: 1800 },
  { name: '13-staff-roles', hash: '#/staff?tab=roles', wait: 1200 },
  { name: '14-staff-audit', hash: '#/staff?tab=audit', wait: 1200 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  // Login screen
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#login-screen:not(.hidden)', { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, '00-login.png') });
  console.log('captured 00-login');

  // Authenticate
  await page.$eval('#login-user', el => { el.value = ''; });
  await page.$eval('#login-pass', el => { el.value = ''; });
  await page.type('#login-user', 'dev', { delay: 20 });
  await page.type('#login-pass', 'dev12345', { delay: 20 });
  await page.click('#login-form button[type=submit]');
  try {
    await page.waitForSelector('#app:not(.hidden)', { timeout: 20000 });
  } catch (e) {
    const err = await page.$eval('#login-error', el => el.textContent).catch(() => '(none)');
    console.error('Login failed, error text:', err);
    await page.screenshot({ path: path.join(OUT, '00-login-fail.png') });
    throw e;
  }
  await new Promise(r => setTimeout(r, 1500));

  for (const p of pages) {
    await page.evaluate(h => { location.hash = h; }, p.hash);
    await new Promise(r => setTimeout(r, p.wait));
    await page.screenshot({ path: path.join(OUT, `${p.name}.png`) });
    console.log('captured', p.name);
  }

  // Mobile screenshot (dashboard)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '15-mobile-dashboard.png') });
  // mobile drawer open
  await page.click('#btn-menu');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, '16-mobile-drawer.png') });
  console.log('captured mobile');

  await browser.close();
  console.log('DONE →', OUT);
})().catch(e => { console.error(e); process.exit(1); });
