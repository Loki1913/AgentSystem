<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use Dotenv\Dotenv;

$root = dirname(__DIR__);
if (is_file($root . '/.env')) {
    Dotenv::createImmutable($root)->safeLoad();
}

function env_value(string $key, string $default = ''): string
{
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
    return is_string($value) && $value !== '' ? $value : $default;
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_chat(): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_response(['error' => 'Método no permitido.'], 405);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 100_000) {
        json_response(['error' => 'La solicitud está vacía o supera el límite de 100 KB.'], 413);
    }

    $body = json_decode($raw, true);
    if (!is_array($body) || !isset($body['message']) || !is_string($body['message'])) {
        json_response(['error' => 'Envía un JSON con el campo message.'], 400);
    }

    $message = trim($body['message']);
    if ($message === '' || mb_strlen($message) > 12_000) {
        json_response(['error' => 'El mensaje debe tener entre 1 y 12 000 caracteres.'], 400);
    }

    $apiKey = env_value('OPENROUTER_API_KEY');
    $model = env_value('OPENROUTER_MODEL');
    $baseUrl = rtrim(env_value('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'), '/');

    if ($apiKey === '' || $model === '') {
        json_response([
            'error' => 'Falta configuración. Copia .env.example a .env y define OPENROUTER_API_KEY y OPENROUTER_MODEL.'
        ], 503);
    }

    if (!function_exists('curl_init')) {
        json_response(['error' => 'La extensión cURL de PHP no está habilitada.'], 500);
    }

    $payload = [
        'model' => $model,
        'messages' => [
            [
                'role' => 'system',
                'content' => 'Eres el asistente principal de AgentSystem. Responde en el idioma del usuario. Sé preciso, reconoce incertidumbre y no afirmes haber usado herramientas que no se hayan ejecutado. En esta primera versión solo puedes conversar; no tienes acceso al ordenador, navegador ni archivos del usuario.'
            ],
            ['role' => 'user', 'content' => $message],
        ],
        'temperature' => 0.4,
        'max_tokens' => 1800,
    ];

    $headers = [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    $referer = env_value('OPENROUTER_HTTP_REFERER');
    $title = env_value('OPENROUTER_APP_TITLE', 'AgentSystem');
    if ($referer !== '') {
        $headers[] = 'HTTP-Referer: ' . $referer;
    }
    if ($title !== '') {
        $headers[] = 'X-Title: ' . $title;
    }

    $ch = curl_init($baseUrl . '/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => max(10, min(120, (int) env_value('OPENROUTER_TIMEOUT', '60'))),
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        json_response(['error' => 'No se pudo conectar con OpenRouter: ' . $curlError], 502);
    }

    $decoded = json_decode($response, true);
    if ($status < 200 || $status >= 300) {
        $providerMessage = is_array($decoded) ? ($decoded['error']['message'] ?? null) : null;
        $safeMessage = is_string($providerMessage) ? mb_substr($providerMessage, 0, 500) : 'El proveedor devolvió un error HTTP ' . $status . '.';
        json_response(['error' => $safeMessage, 'provider_status' => $status], 502);
    }

    $answer = $decoded['choices'][0]['message']['content'] ?? null;
    if (!is_string($answer) || trim($answer) === '') {
        json_response(['error' => 'La respuesta del modelo no tenía contenido de texto utilizable.'], 502);
    }

    json_response([
        'answer' => $answer,
        'model' => $decoded['model'] ?? $model,
        'usage' => $decoded['usage'] ?? null,
    ]);
}

if (($_GET['api'] ?? '') === 'chat') {
    request_chat();
}

$appTitle = htmlspecialchars(env_value('OPENROUTER_APP_TITLE', 'AgentSystem'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title><?= $appTitle ?></title>
  <style>
    :root{color-scheme:dark;--bg:#090b10;--panel:#11151e;--line:#252c3a;--text:#edf1fa;--muted:#929db1;--accent:#a5b4fc;--accent2:#818cf8}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#171d30 0%,var(--bg) 55%);color:var(--text);font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh}
    .shell{max-width:920px;margin:auto;padding:36px 20px 24px;min-height:100vh;display:flex;flex-direction:column}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:26px}
    .brand{display:flex;align-items:center;gap:13px}.mark{width:42px;height:42px;border:1px solid #465174;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#222b48,#121621);color:var(--accent);font-weight:800;font-size:20px}
    h1{font-size:20px;letter-spacing:-.04em;margin:0}.sub{font-size:12px;color:var(--muted);margin-top:2px}.status{font-size:12px;color:#c7d2fe;border:1px solid #343e60;background:#151b2b;padding:6px 10px;border-radius:999px}
    .intro{margin:20px 0 24px}.eyebrow{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.intro h2{font-size:clamp(28px,5vw,42px);line-height:1.12;letter-spacing:-.05em;margin:10px 0}.intro p{color:var(--muted);max-width:660px;margin:0}
    .notice{background:#171a22;border:1px solid var(--line);border-radius:12px;padding:12px 14px;color:#b9c2d3;font-size:12px;margin:18px 0}
    .conversation{display:flex;flex-direction:column;gap:14px;flex:1;min-height:210px;margin:6px 0 20px}.empty{border:1px dashed #303849;border-radius:16px;padding:26px;color:var(--muted);text-align:center}.msg{max-width:88%;padding:14px 16px;border:1px solid var(--line);border-radius:15px;white-space:pre-wrap;overflow-wrap:anywhere}.user{align-self:flex-end;background:#1c2440;border-color:#333f66}.assistant{align-self:flex-start;background:var(--panel)}.error{border-color:#783c49;color:#ffc5cd}
    form{border:1px solid #343c4e;background:#11151e;padding:10px;border-radius:17px;display:flex;gap:10px;align-items:flex-end;box-shadow:0 14px 50px #0003}textarea{resize:vertical;min-height:56px;max-height:220px;flex:1;background:transparent;color:var(--text);border:0;outline:0;padding:11px;font:inherit}button{background:var(--accent);color:#111526;border:0;border-radius:11px;padding:12px 17px;font-weight:750;cursor:pointer;min-height:44px}button:disabled{opacity:.5;cursor:wait}.foot{font-size:11px;color:#6f7b91;text-align:center;margin-top:12px}
    @media(max-width:600px){.shell{padding:22px 14px}.status{display:none}.msg{max-width:96%}form{align-items:stretch}button{padding:10px}}
  </style>
</head>
<body>
<main class="shell">
  <header class="top">
    <div class="brand"><div class="mark">A</div><div><h1><?= $appTitle ?></h1><div class="sub">Espacio personal de agentes de IA · versión inicial</div></div></div>
    <div class="status">● Núcleo en construcción</div>
  </header>
  <section class="intro">
    <div class="eyebrow">Milestone 01 · Model gateway</div>
    <h2>De una tarea a un sistema de agentes.</h2>
    <p>Esta primera versión valida la interfaz local y la conexión al modelo. La navegación web, análisis de imágenes, investigación con fuentes y programación autónoma todavía no están habilitados.</p>
  </section>
  <div class="notice">Privacidad: la clave de OpenRouter se guarda en el servidor, en tu archivo local <code>.env</code>. No la pegues en el chat ni la subas a GitHub.</div>
  <section id="conversation" class="conversation" aria-live="polite"><div class="empty">Escribe una tarea para probar el modelo configurado.</div></section>
  <form id="chat-form">
    <textarea id="message" maxlength="12000" placeholder="Describe una tarea..." aria-label="Mensaje" required></textarea>
    <button id="send" type="submit">Enviar ↗</button>
  </form>
  <div class="foot">AgentSystem no ejecuta acciones externas en esta fase. Revisa siempre las respuestas antes de actuar.</div>
</main>
<script>
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const conversation = document.querySelector('#conversation');
function addMessage(text, kind) {
  const empty = conversation.querySelector('.empty');
  if (empty) empty.remove();
  const node = document.createElement('div');
  node.className = 'msg ' + kind;
  node.textContent = text;
  conversation.appendChild(node);
  node.scrollIntoView({behavior:'smooth', block:'nearest'});
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || send.disabled) return;
  addMessage(message, 'user');
  input.value = '';
  send.disabled = true;
  send.textContent = 'Pensando…';
  const placeholder = document.createElement('div');
  placeholder.className = 'msg assistant';
  placeholder.textContent = 'Conectando con el modelo…';
  conversation.appendChild(placeholder);
  try {
    const response = await fetch('?api=chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message})
    });
    const data = await response.json();
    placeholder.textContent = response.ok ? data.answer : (data.error || 'Error desconocido.');
    if (!response.ok) placeholder.classList.add('error');
    if (response.ok && data.model) placeholder.title = 'Modelo: ' + data.model;
  } catch (error) {
    placeholder.textContent = 'No se pudo contactar con el servidor local. Revisa PHP y vuelve a intentarlo.';
    placeholder.classList.add('error');
  } finally {
    send.disabled = false;
    send.textContent = 'Enviar ↗';
    input.focus();
  }
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
});
</script>
</body>
</html>
