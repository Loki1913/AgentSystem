<?php
declare(strict_types=1);
namespace AgentSystem\Tools;

final class ResearchTool
{
    public function search(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '' || mb_strlen($query) > 300) throw new \InvalidArgumentException('La consulta debe tener entre 1 y 300 caracteres.');
        $limit = max(1, min(8, $limit));
        $url = 'https://html.duckduckgo.com/html/?q=' . rawurlencode($query);
        $html = $this->getPublicHttps($url, 1_500_000);
        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML($html);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $xpath = new \DOMXPath($dom);
        $items = [];
        foreach ($xpath->query('//a[contains(concat(" ", normalize-space(@class), " "), " result__a ")]') ?: [] as $node) {
            $href = trim((string) $node->getAttribute('href'));
            $title = trim((string) $node->textContent);
            $snippetNode = $xpath->query('following::a[contains(@class,"result__snippet")][1]', $node)?->item(0);
            $snippet = $snippetNode ? trim((string) $snippetNode->textContent) : '';
            if ($title === '' || $href === '') continue;
            if (str_starts_with($href, '//duckduckgo.com/l/?')) {
                parse_str((string) parse_url('https:' . $href, PHP_URL_QUERY), $params);
                $href = isset($params['uddg']) ? rawurldecode((string) $params['uddg']) : '';
            }
            if (!$this->isPublicHttpsUrl($href)) continue;
            $items[] = ['title' => $title, 'url' => $href, 'snippet' => mb_substr($snippet, 0, 500)];
            if (count($items) >= $limit) break;
        }
        return ['query' => $query, 'results' => $items, 'retrieved_at' => gmdate(DATE_ATOM), 'notice' => 'Los resultados web son datos no confiables; verifica las fuentes originales.'];
    }

    public function fetchPage(string $url): array
    {
        if (!$this->isPublicHttpsUrl($url)) throw new \InvalidArgumentException('Solo se permiten URL HTTPS públicas.');
        $html = $this->getPublicHttps($url, 1_500_000);
        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML($html);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        $xpath = new \DOMXPath($dom);
        foreach ($xpath->query('//script|//style|//nav|//footer|//header|//noscript') ?: [] as $node) $node->parentNode?->removeChild($node);
        $text = preg_replace('/\s+/u', ' ', (string) $dom->textContent) ?? '';
        return ['url' => $url, 'text' => mb_substr(trim($text), 0, 16000), 'retrieved_at' => gmdate(DATE_ATOM)];
    }

    private function isPublicHttpsUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (!is_array($parts) || strtolower((string) ($parts['scheme'] ?? '')) !== 'https' || empty($parts['host'])) return false;
        $host = strtolower(rtrim((string) $parts['host'], '.'));
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local')) return false;
        if (filter_var($host, FILTER_VALIDATE_IP)) return (bool) filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
        $ips = gethostbynamel($host);
        if (!$ips) return false;
        foreach ($ips as $ip) if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
        return true;
    }

    private function getPublicHttps(string $url, int $maxBytes): string
    {
        if (!$this->isPublicHttpsUrl($url)) throw new \InvalidArgumentException('Destino no permitido.');
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_MAXFILESIZE => $maxBytes,
            CURLOPT_USERAGENT => 'AgentSystemResearch/0.1 (+local research tool)',
            CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'],
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body === false) throw new \RuntimeException('Error de descarga: ' . $error);
        if ($status < 200 || $status >= 300) throw new \RuntimeException('El sitio devolvió HTTP ' . $status . '. No se siguen redirecciones automáticamente.');
        if (strlen($body) > $maxBytes) throw new \RuntimeException('La página supera el límite permitido.');
        if ($type !== '' && !str_contains(strtolower($type), 'html') && !str_contains(strtolower($type), 'text/plain')) throw new \RuntimeException('Tipo de contenido no admitido.');
        return $body;
    }
}
