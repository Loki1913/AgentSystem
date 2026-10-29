<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use AgentSystem\Config;
use AgentSystem\Coordinator;
use AgentSystem\Tools\WorkspaceTool;
use Dotenv\Dotenv;

$root = dirname(__DIR__);
if (is_file($root . '/.env')) Dotenv::createImmutable($root)->safeLoad();

function env_value(string $key, string $default = ''): string
{
    return Config::get($key, $default);
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function assert_local_request(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $expected = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
            . '://' . ($_SERVER['HTTP_HOST'] ?? '127.0.0.1:8080');
        if (!hash_equals($expected, $origin)) json_response(['error' => 'Origen no permitido.'], 403);
    }
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? '127.0.0.1'));
    if (!in_array(explode(':', $host)[0], ['127.0.0.1', 'localhost', '[::1]'], true)) {
        json_response(['error' => 'AgentSystem está diseñado para ejecutarse localmente.'], 403);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 7_000_000) json_response(['error' => 'Solicitud vacía o demasiado grande.'], 413);
    $body = json_decode($raw, true);
    if (!is_array($body)) json_response(['error' => 'JSON no válido.'], 400);
    return $body;
}

function handle_api(): never
{
    assert_local_request();
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') json_response(['error' => 'Método no permitido.'], 405);
    $body = read_json_body();
    $route = (string) ($_GET['api'] ?? '');

    try {
        if ($route === 'run') {
            $task = $body['message'] ?? '';
            $mode = $body['mode'] ?? 'general';
            $image = $body['image'] ?? null;
            $allowWorkspaceWrites = ($body['allow_workspace_writes'] ?? false) === true;
            if (!is_string($task) || !is_string($mode) || ($image !== null && !is_string($image))) {
                json_response(['error' => 'Tipos de datos no válidos.'], 400);
            }
            $result = (new Coordinator())->run($task, $mode, $image, $allowWorkspaceWrites);
            json_response($result);
        }

        if ($route === 'tasks') json_response(['tasks' => (new Coordinator())->recentTasks(50)]);

        if ($route === 'workspace') {
            $tool = new WorkspaceTool();
            $action = (string) ($body['action'] ?? 'list');
            if ($action === 'list') json_response(['files' => $tool->listFiles()]);
            if ($action === 'read') {
                if (!is_string($body['path'] ?? null)) json_response(['error' => 'Falta path.'], 400);
                json_response($tool->read($body['path']));
            }
            if ($action === 'write') {
                if (!is_string($body['path'] ?? null) || !is_string($body['content'] ?? null)) json_response(['error' => 'Faltan path o content.'], 400);
                json_response($tool->write($body['path'], $body['content']));
            }
            json_response(['error' => 'Acción de workspace no reconocida.'], 400);
        }

        json_response(['error' => 'Ruta API no encontrada.'], 404);
    } catch (InvalidArgumentException $e) {
        json_response(['error' => $e->getMessage()], 400);
    } catch (Throwable $e) {
        error_log('[AgentSystem] ' . get_class($e) . ': ' . $e->getMessage());
        json_response(['error' => $e->getMessage()], 502);
    }
}

if (isset($_GET['api'])) handle_api();

$appTitle = htmlspecialchars(env_value('OPENROUTER_APP_TITLE', 'AgentSystem'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title><?= $appTitle ?></title>
  <style>
    :root{color-scheme:dark;--bg:#090b10;--panel:#11151e;--line:#252c3a;--text:#edf1fa;--muted:#929db1;--accent:#a5b4fc}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at top,#171d30 0%,var(--bg) 55%);color:var(--text);font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh}
    .shell{max-width:980px;margin:auto;padding:30px 20px 24px;min-height:100vh;display:flex;flex-direction:column}.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
    .brand{display:flex;align-items:center;gap:13px}.mark{width:42px;height:42px;border:1px solid #465174;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#222b48,#121621);color:var(--accent);font-weight:800;font-size:20px}
    h1{font-size:20px;letter-spacing:-.04em;margin:0}.sub{font-size:12px;color:var(--muted);margin-top:2px}.status{font-size:12px;color:#c7d2fe;border:1px solid #343e60;background:#151b2b;padding:6px 10px;border-radius:999px}
    .intro{margin:12px 0 18px}.eyebrow{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.intro h2{font-size:clamp(27px,5vw,40px);line-height:1.12;letter-spacing:-.05em;margin:9px 0}.intro p{color:var(--muted);max-width:720px;margin:0}
    .notice{background:#171a22;border:1px solid var(--line);border-radius:12px;padding:11px 14px;color:#b9c2d3;font-size:12px;margin:16px 0}
    .tools{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0 16px}.tool{border:1px solid var(--line);border-radius:13px;background:#11151e;padding:12px}.tool label{display:block;color:#d7ddef;font-size:12px;margin-bottom:7px}.tool select,.tool input{width:100%;background:#0c1018;border:1px solid #2d3547;border-radius:9px;color:var(--text);padding:10px;font:inherit}.tool small{display:block;color:var(--muted);margin-top:6px;font-size:11px}
    .conversation{display:flex;flex-direction:column;gap:12px;flex:1;min-height:190px;margin:5px 0 18px}.empty{border:1px dashed #303849;border-radius:16px;padding:24px;color:var(--muted);text-align:center}.msg{max-width:92%;padding:14px 16px;border:1px solid var(--line);border-radius:15px;white-space:pre-wrap;overflow-wrap:anywhere}.user{align-self:flex-end;background:#1c2440;border-color:#333f66}.assistant{align-self:flex-start;background:var(--panel)}.error{border-color:#783c49;color:#ffc5cd}.sources{font-size:12px;color:var(--muted);margin-top:10px}.sources a{color:#c7d2fe;display:block;margin-top:5px;overflow-wrap:anywhere}
    form{border:1px solid #343c4e;background:#11151e;padding:10px;border-radius:17px;display:flex;gap:10px;align-items:flex-end;box-shadow:0 14px 50px #0003}textarea{resize:vertical;min-height:56px;max-height:220px;flex:1;background:transparent;color:var(--text);border:0;outline:0;padding:11px;font:inherit}button{background:var(--accent);color:#111526;border:0;border-radius:11px;padding:12px 17px;font-weight:750;cursor:pointer;min-height:44px}button:disabled{opacity:.5;cursor:wait}.foot{font-size:11px;color:#6f7b91;text-align:center;margin-top:12px}
    @media(max-width:600px){.shell{padding:20px 13px}.status{display:none}.msg{max-width:98%}.tools{grid-template-columns:1fr}form{align-items:stretch}button{padding:10px}}
  </style>
</head>
<body>
<main class="shell">
  <header class="top">
    <div class="brand"><div class="mark">A</div><div><h1><?= $appTitle ?></h1><div class="sub">Espacio personal de agentes de IA · versión de desarrollo</div></div></div>
    <div class="status">● Núcleo experimental</div>
  </header>
  <section class="intro">
    <div class="eyebrow">Multi-agent workspace</div>
    <h2>Un espacio para investigar, analizar y construir.</h2>
    <p>Elige un modo para orientar la tarea. Las herramientas experimentales tienen límites; el sistema no realiza acciones externas sensibles ni ejecuta código generado automáticamente.</p>
  </section>
  <div class="notice">Privacidad: la clave de OpenRouter permanece en el servidor local, en <code>.env</code>. Las imágenes que envíes se transmiten al proveedor configurado. No subas secretos ni documentos sensibles.</div>
  <div class="tools">
    <div class="tool"><label for="mode">Modo de trabajo</label><select id="mode"><option value="general">General</option><option value="research">Investigación web con fuentes</option><option value="vision">Análisis visual</option><option value="coding">Programación con archivos</option><option value="browser">Navegador web (solo lectura)</option></select><small>Investigación usa fuentes públicas; navegador requiere el worker Playwright iniciado y una URL HTTPS en la tarea.</small><label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px"><input id="allow-write" type="checkbox" style="width:auto"> Permitir escritura en workspace/ para tareas de programación</label></div>
    <div class="tool"><label for="image">Imagen opcional</label><input id="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>PNG, JPEG, WEBP o GIF; máximo aproximado 4,5 MB. El modelo debe admitir visión.</small></div>
  </div>
  <section id="conversation" class="conversation" aria-live="polite"><div class="empty">Escribe una tarea para iniciar una conversación.</div></section>
  <form id="chat-form"><textarea id="message" maxlength="12000" placeholder="¿Qué necesitas investigar, analizar o construir?" aria-label="Mensaje" required></textarea><button id="send" type="submit">Ejecutar ↗</button></form>
  <div class="foot">Las respuestas y el código generado deben revisarse. La navegación y ejecución autónoma aún son limitadas.</div>
</main>
<script>
const form=document.querySelector('#chat-form'),input=document.querySelector('#message'),send=document.querySelector('#send'),conversation=document.querySelector('#conversation'),mode=document.querySelector('#mode'),imageInput=document.querySelector('#image'),allowWrite=document.querySelector('#allow-write');
function addMessage(text,kind){const empty=conversation.querySelector('.empty');if(empty)empty.remove();const node=document.createElement('div');node.className='msg '+kind;node.textContent=text;conversation.appendChild(node);node.scrollIntoView({behavior:'smooth',block:'nearest'});return node;}
function readImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file);});}
form.addEventListener('submit',async event=>{
 event.preventDefault();const message=input.value.trim(),file=imageInput.files[0];if((!message&&!file)||send.disabled)return;
 if(file&&file.size>4_500_000){addMessage('La imagen supera el límite aproximado de 4,5 MB.','assistant error');return;}
 addMessage((message||'Analiza esta imagen.')+(file?'\n[Imagen: '+file.name+']':''),'user');input.value='';send.disabled=true;send.textContent='Procesando…';
 const placeholder=addMessage('Preparando la tarea…','assistant');
 try{
  const payload={message:message||'Analiza esta imagen.',mode:mode.value,allow_workspace_writes:allowWrite.checked};
  if(file)payload.image=await readImage(file);
  const response=await fetch('?api=run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Error desconocido.');
  placeholder.textContent=data.answer+(data.model?'\n\nModelo: '+data.model:'');
  if(Array.isArray(data.sources)&&data.sources.length){const section=document.createElement('div');section.className='sources';section.textContent='Fuentes recuperadas';for(const source of data.sources){const a=document.createElement('a');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=source.title+' — '+source.url;section.appendChild(a);}placeholder.appendChild(section);}
 }catch(error){placeholder.textContent=String(error.message||'No se pudo completar la tarea.');placeholder.classList.add('error');}
 finally{send.disabled=false;send.textContent='Ejecutar ↗';input.focus();}
});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
</script>
</body>
</html>
