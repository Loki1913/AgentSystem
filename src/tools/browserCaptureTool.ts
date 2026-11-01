import * as cheerio from 'cheerio';
import { Config } from '../config.js';

export interface BrowserInspectionResult {
  url: string;
  title: string;
  text: string;
  links: Array<{ text: string; href: string }>;
  forms: Array<{ action?: string; method?: string; inputs: string[] }>;
  screenshot_base64?: string;
  worker_connected: boolean;
  notice: string;
}

export class BrowserCaptureTool {
  public async inspect(url: string): Promise<BrowserInspectionResult> {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('https://')) {
      throw new Error('El navegador solo inspecciona URLs HTTPS públicas.');
    }

    // Try communicating with Playwright worker first
    const workerUrl = Config.browserWorkerUrl.replace(/\/+$/, '');
    const token = Config.browserWorkerToken;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${workerUrl}/inspect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: cleanUrl }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        return {
          url: cleanUrl,
          title: String(data.title || cleanUrl),
          text: String(data.text || '').slice(0, 16000),
          links: Array.isArray(data.links) ? (data.links as Array<{ text: string; href: string }>) : [],
          forms: Array.isArray(data.forms) ? (data.forms as Array<{ action?: string; method?: string; inputs: string[] }>) : [],
          screenshot_base64: typeof data.screenshot_base64 === 'string' ? data.screenshot_base64 : undefined,
          worker_connected: true,
          notice: 'Inspección realizada mediante worker Playwright.'
        };
      }
    } catch {
      // Worker offline or unreachable: fall back to built-in HTTP DOM & interactive inspection
    }

    // Built-in DOM and page inspection fallback
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AgentSystemBrowser/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      throw new Error(`La página remota respondió con estado HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || $('h1').first().text().trim() || cleanUrl;

    // Collect interactive elements
    const links: Array<{ text: string; href: string }> = [];
    $('a[href]').slice(0, 25).each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href') || '';
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absolute = new URL(href, cleanUrl).toString();
          links.push({ text: text.slice(0, 80), href: absolute });
        } catch {
          // ignore invalid
        }
      }
    });

    const forms: Array<{ action?: string; method?: string; inputs: string[] }> = [];
    $('form').slice(0, 10).each((_, formEl) => {
      const inputs: string[] = [];
      $(formEl).find('input, select, textarea, button').each((_, inputEl) => {
        const name = $(inputEl).attr('name') || $(inputEl).attr('placeholder') || $(inputEl).attr('type') || inputEl.tagName;
        inputs.push(name);
      });
      forms.push({
        action: $(formEl).attr('action'),
        method: ($(formEl).attr('method') || 'GET').toUpperCase(),
        inputs: inputs.slice(0, 10)
      });
    });

    $('script, style, noscript, svg').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url: cleanUrl,
      title: title.slice(0, 150),
      text: text.slice(0, 16000),
      links,
      forms,
      worker_connected: false,
      notice: 'Inspección de estructura web y DOM completada (modo integrado).'
    };
  }
}

export const browserCaptureTool = new BrowserCaptureTool();
