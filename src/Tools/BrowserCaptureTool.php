<?php
declare(strict_types=1);
namespace AgentSystem\Tools;

final class BrowserCaptureTool
{
    public function inspect(string $url): array
    {
        $parts = parse_url($url);
        if (!is_array($parts) || strtolower((string) ($parts['scheme'] ?? '')) !== 'https' || empty($parts['host'])) {
            throw new \InvalidArgumentException('Introduce una URL HTTPS pública.');
        }
        $base = rtrim(\\AgentSystem\\Config::get('BROWSER_WORKER_URL', 'http://127.0.0.1:8091'), '/');
        $token = \\AgentSystem\\Config::get('BROWSER_WORKER_TOKEN');
        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        if ($token !== '') $headers[] = 'Authorization: Bearer ' . $token;
        $ch = curl_init($base . '/inspect');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode(['url' => $url], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 35,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body === false) throw new \RuntimeException('No se pudo contactar al worker Playwright: ' . $error . '. Comprueba que esté iniciado.');
        $data = json_decode($body, true);
        if (!is_array($data)) throw new \RuntimeException('El worker de navegador devolvió una respuesta no válida.');
        if ($status < 200 || $status >= 300) throw new \RuntimeException((string) ($data['error'] ?? ('Error del worker: HTTP ' . $status)));
        if (isset($data['screenshot_base64']) && (!is_string($data['screenshot_base64']) || strlen($data['screenshot_base64']) > 2_000_000)) unset($data['screenshot_base64']);
        return $data;
    }
}
