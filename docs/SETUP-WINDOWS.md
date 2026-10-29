# Windows setup

## 1. Install prerequisites
- PHP 8.2 or newer with `curl`, `mbstring`, and `dom` extensions enabled.
- Composer 2.
- Node.js 20+ (only needed for browser mode).

Confirm in PowerShell:
```powershell
php -v
php -m
composer --version
node --version
```

## 2. Configure the application
From the repository directory:
```powershell
Copy-Item .env.example .env
notepad .env
```
Fill `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Optionally set `OPENROUTER_VISION_MODEL` to a multimodal model. Never commit `.env`.

Install PHP dependencies and run checks:
```powershell
composer install
composer validate --no-check-publish
php tests/smoke.php
php -S 127.0.0.1:8080 -t public
```
Open http://127.0.0.1:8080. The model request may use free quota or paid credits depending on the selected model and account.

## 3. Optional browser worker
In a second PowerShell window:
```powershell
cd worker
npm install
npm run install-browser
$env:BROWSER_WORKER_TOKEN = [guid]::NewGuid().ToString() + [guid]::NewGuid().ToString()
$env:BROWSER_WORKER_PORT = "8091"
npm start
```
Copy the same token into `BROWSER_WORKER_TOKEN` in the root `.env`, then restart the PHP server. Choose “Navegador web (solo lectura)” and include a public HTTPS URL in the task. Keep both services bound to loopback.

## Known limitations
- The browser worker is an experimental read-only prototype.
- Some free models reject tool calls, vision input, or exceed their quotas.
- Research HTML structure can change and results need manual source verification.
- Coding writes are confined to `workspace/`; no generated code is executed automatically.
