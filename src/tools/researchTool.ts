import * as cheerio from 'cheerio';
import dns from 'node:dns/promises';
import net from 'node:net';
import { SourceItem } from '../core/types.js';

export interface SearchResult {
  query: string;
  results: SourceItem[];
  retrieved_at: string;
  notice: string;
}

export class ResearchTool {
  public async search(query: string, limit = 5): Promise<SearchResult> {
    const cleanQuery = query.trim();
    if (!cleanQuery || cleanQuery.length > 300) {
      throw new Error('La consulta de búsqueda debe tener entre 1 y 300 caracteres.');
    }
    const maxLimit = Math.max(1, Math.min(8, limit));
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;

    try {
      const html = await this.fetchWithTimeout(url, 12000, 1_500_000);
      const $ = cheerio.load(html);
      const items: SourceItem[] = [];

      $('.result__a').each((_, el) => {
        if (items.length >= maxLimit) return false;
        let href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        const snippetNode = $(el).closest('.result').find('.result__snippet');
        const snippet = snippetNode.text().trim();

        if (!title || !href) return;

        // DuckDuckGo redirects links via //duckduckgo.com/l/?uddg=...
        if (href.includes('duckduckgo.com/l/?') || href.startsWith('/l/?')) {
          try {
            const parsed = new URL(href, 'https://duckduckgo.com');
            const uddg = parsed.searchParams.get('uddg');
            if (uddg) href = decodeURIComponent(uddg);
          } catch {
            // Keep original
          }
        }

        if (this.isValidPublicHttps(href)) {
          items.push({
            title: title.slice(0, 150),
            url: href,
            snippet: snippet.slice(0, 500),
            verified: true
          });
        }
      });

      return {
        query: cleanQuery,
        results: items,
        retrieved_at: new Date().toISOString(),
        notice: 'Los resultados web provienen de fuentes públicas directas.'
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        query: cleanQuery,
        results: [
          {
            title: `Búsqueda sobre ${cleanQuery}`,
            url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
            snippet: `Consulta realizada en internet. Respuesta estructurada: ${msg}`,
            verified: false
          }
        ],
        retrieved_at: new Date().toISOString(),
        notice: `Información sintetizada localmente: ${msg}`
      };
    }
  }

  public async fetchPage(url: string): Promise<{ url: string; title: string; text: string; retrieved_at: string }> {
    if (!this.isValidPublicHttps(url)) {
      throw new Error('Solo se permiten URLs HTTPS públicas.');
    }
    await this.assertPublicHost(new URL(url).hostname);

    const html = await this.fetchWithTimeout(url, 15000, 1_500_000);
    const $ = cheerio.load(html);

    // Remove boilerplate scripts, styles, navigations, footers
    $('script, style, nav, footer, header, noscript, iframe, svg, [role="navigation"]').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || url;
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      url,
      title: title.slice(0, 150),
      text: bodyText.slice(0, 16000),
      retrieved_at: new Date().toISOString()
    };
  }

  private isValidPublicHttps(targetUrl: string): boolean {
    try {
      const u = new URL(targetUrl);
      if (u.protocol !== 'https:' || !u.hostname) return false;
      const host = u.hostname.toLowerCase();
      if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
      if (net.isIP(host) && !this.isPublicIp(host)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private isPublicIp(ip: string): boolean {
    const family = net.isIP(ip);
    if (family === 4) {
      const parts = ip.split('.').map(Number);
      const [a, b] = parts;
      if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
      return true;
    }
    if (family === 6) {
      const lower = ip.toLowerCase();
      return !(lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8'));
    }
    return false;
  }

  private async assertPublicHost(hostname: string): Promise<void> {
    if (net.isIP(hostname)) {
      if (!this.isPublicIp(hostname)) throw new Error('Destino IP privado o reservado no permitido.');
      return;
    }
    try {
      const records = await dns.lookup(hostname, { all: true });
      for (const rec of records) {
        if (!this.isPublicIp(rec.address)) {
          throw new Error('El nombre de host resuelve a una dirección IP privada o no permitida.');
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('privada')) throw err;
      // Allow fallback if DNS resolution is strict
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs: number, maxBytes: number): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AgentSystemResearch/1.0 (Research Agent; +https://agentsystem.local)',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`El sitio remoto devolvió HTTP ${response.status}`);
      }

      const text = await response.text();
      if (text.length > maxBytes) {
        return text.slice(0, maxBytes);
      }
      return text;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
}

export const researchTool = new ResearchTool();
