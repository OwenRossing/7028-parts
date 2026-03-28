import puppeteer from 'puppeteer';

const themes = ['default', 'liquid-glass', 'cinnamon-bun', 'industrial-standard'];

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// Login once, reuse cookies
const loginPage = await browser.newPage();
await loginPage.setViewport({ width: 1280, height: 800 });
await loginPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
await loginPage.type('input', '7028');
await loginPage.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 1500));
// Click first user button
await loginPage.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => !b.textContent.includes('Back'));
  if (btn) btn.click();
});
await new Promise(r => setTimeout(r, 2000));
const cookies = await loginPage.cookies();
console.log('Logged in, url:', loginPage.url());
await loginPage.close();

// Screenshot each theme
for (const theme of themes) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setCookie(...cookies);
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000)); // let React hydrate + data load

  // Apply theme class
  await page.evaluate((t) => {
    document.documentElement.className = t === 'default' ? '' : t;
  }, theme);

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `C:/Users/Owen/Repositories/7028-parts/theme-screenshot-${theme}.png` });
  console.log(`Captured: ${theme}`);
  await page.close();
}

await browser.close();
console.log('Done.');
