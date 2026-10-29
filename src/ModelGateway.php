<?php
declare(strict_types=1);
namespace AgentSystem;

use NeuronAI\Providers\OpenAILike;

final class ModelGateway
{
    public function provider(?string $model = null): OpenAILike
    {
        $base = rtrim(Config::get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'), '/') . '/';
        $provider = new OpenAILike(
            $base,
            Config::requireValue('OPENROUTER_API_KEY'),
            $model ?: Config::requireValue('OPENROUTER_MODEL'),
            ['temperature' => 0.3, 'max_tokens' => Config::int('AGENT_MAX_TOKENS', 2500, 128, 8000)]
        );
        return $provider;
    }

    public function rawChat(array $messages, ?string $model = null, array $tools = []): array
    {
        $apiKey = Config::requireValue('OPENROUTER_API_KEY');
        $modelId = $model ?: Config::requireValue('OPENROUTER_MODEL');
        $url = rtrim(Config::get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'), '/') . '/chat/completions';
        $payload = [
            'model' => $modelId,
            'messages' => $messages,
            'temperature' => 0.3,
            'max_tokens' => Config::int('AGENT_MAX_TOKENS', 2500, 128, 8000),
        ];
        if ($tools !== []) { $payload['tools'] = $tools; $payload['tool_choice'] = 'auto'; }
        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        $referer = Config::get('OPENROUTER_HTTP_REFERER');
        if ($referer !== '') $headers[] = 'HTTP-Referer: ' . $referer;
        $title = Config::get('OPENROUTER_APP_TITLE', 'AgentSystem');
        if ($title !== '') $headers[] = 'X-Title: ' . $title;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => Config::int('OPENROUTER_TIMEOUT', 60, 10, 120),
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $body = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($body === false) throw new \RuntimeException('Error de conexión con OpenRouter: ' . $error);
        $decoded = json_decode($body, true);
        if (!is_array($decoded)) throw new \RuntimeException('OpenRouter devolvió una respuesta no válida.');
        if ($status < 200 || $status >= 300) {
            $message = $decoded['error']['message'] ?? ('Error HTTP ' . $status);
            throw new \RuntimeException('OpenRouter: ' . mb_substr((string) $message, 0, 400));
        }
        return $decoded;
    }
}
