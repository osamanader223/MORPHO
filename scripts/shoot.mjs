// Visual parity check: shoot the built page once the intro has settled and save the shots
// next to the approved ones in reference/screens/.
//
//   npm run build && npm run shoot               serves dist/ itself on the preview port
//   npm run shoot -- https://example.vercel.app  shoots a live URL instead
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const screen = (name) => fileURLToPath(new URL(`../reference/screens/${name}`, import.meta.url));
const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const shots = [
  { file: 'build-mobile.png', compare: 'mobile-settled.png', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { file: 'build-desktop.png', compare: 'desktop-settled.png', viewport: { width: 1440, height: 900 } },
];

let server = null;
let url = process.argv[2];
if (!url) {
  server = await preview({ root, logLevel: 'warn', preview: { port: 4173 } });
  url = server.resolvedUrls.local[0];
}

async function hasWebGL(browser) {
  const page = await browser.newPage();
  const ok = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl'));
  await page.close();
  return ok;
}

let browser = await chromium.launch();
if (!(await hasWebGL(browser))) {
  await browser.close();
  console.log('Headless Chromium has no WebGL here; using SwiftShader (software, slow).');
  browser = await chromium.launch({ args: SWIFTSHADER });
}

let problems = 0;
try {
  for (const { file, compare, ...device } of shots) {
    const context = await browser.newContext({ ...device, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') problems++;
      if (m.type() === 'error' || m.type() === 'warning' || m.text().startsWith('[morpho]')) console.log(`  [${m.type()}] ${m.text()}`);
    });
    page.on('pageerror', (e) => { problems++; console.log(`  [pageerror] ${e.message}`); });

    await page.goto(url);
    // The intro is over when the hint and replay button come in; wait for their fade to finish.
    await page.waitForSelector('#tools.on', { timeout: 120_000 });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('tools')).opacity === '1');
    const fallback = await page.$('html.nogl');
    await page.screenshot({ path: screen(file) });
    console.log(`${file}  ${device.viewport.width}x${device.viewport.height}  compare with ${compare}${fallback ? '  (WebGL fallback shown!)' : ''}`);
    await context.close();
  }
} finally {
  await browser.close();
  if (server) await server.close();
}
if (problems) console.log(`${problems} console error(s) above.`);
