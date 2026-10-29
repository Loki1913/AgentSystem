import http from 'node:http';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { chromium } from 'playwright';

const HOST = process.env.BROWSER_WORKER_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.BROWSER_WORKER_PORT || '8091', 10);
const TOKEN = process.env.BROWSER_WORKER_TOKEN || '';
const MAX_BODY = 16_000;
const ALLOWED_SCHEMES = new Set(['https:']);

function validateUrl(raw) {
  const url = new URL(raw);
  if (!ALLOWED_SCHEMES.has(url.protocol)) throw new Error('Solo se permiten URL HTTPS.');
  if (url.username || url.password) throw new Error('No se permiten credenciales embebidas en URL.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isIP(host)) {
    throw new Error('Host local o IP no permitido.');
  }
  return url;
}

function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const p = address.split('.').map(Number);
    const [a,b] = p;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0 && p[2] === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (isIP(address) === 6) {
    const v = address.toLowerCase();
    return !(v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') ||
      v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') ||
      v.startsWith('::ffff:'));
  }
  return false;
}

async function assertPublicHost(host) {
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error('IP privada o reservada no permitida.');
    return;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(record => !isPublicAddress(record.address))) {
    throw new Error('El host resuelve a una IP privada o reservada.');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY) {
        reject(new Error('Solicitud demasiado grande.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' || req.url !== '/inspect') {
    res.writeHead(404).end(JSON.stringify({ error: 'Ruta no encontrada.' }));
    return;
  }
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end(JSON.stringify({ error: 'No autorizado.' }));
    return;
  }
  let browser;
  try {
    const input = JSON.parse(await readBody(req));
    const target = validateUrl(String(input.url || ''));
    await assertPublicHost(target.hostname);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: true,
      serviceWorkers: 'block',
      viewport: { width: 1365, height: 900 },
      ignoreHTTPSErrors: false
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(5000);
    // The worker intentionally exposes inspection only: no click, fill, submit, or downloads.
    await page.route('**/*', async route => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.protocol !== 'https:' || requestUrl.username || requestUrl.password) {
        await route.abort();
        return;
      }
      const h = requestUrl.hostname.toLowerCase();
      if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
        await route.abort();
        return;
      }
      try { await assertPublicHost(h); } catch { await route.abort(); return; }
      await route.continue();
    });
    await page.goto(target.toString(), { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(() => ({
      title: document.title || '',
      url: location.href,
      text: (document.body?.innerText || '').slice(0, 16000)
    }));
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    res.writeHead(200).end(JSON.stringify({
      ...result,
      screenshot_base64: screenshot.toString('base64'),
      notice: 'Inspección de solo lectura. La página es contenido no confiable; no se ejecutaron acciones de usuario.'
    }));
    await context.close();
  } catch (error) {
    if (!res.headersSent) res.writeHead(400).end(JSON.stringify({ error: String(error.message || 'Error del navegador').slice(0, 500) }));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AgentSystem browser worker listening on http://${HOST}:${PORT}`);
});
