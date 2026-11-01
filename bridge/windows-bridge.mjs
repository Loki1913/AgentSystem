/**
 * AgentSystem - Local Bridge Client para Windows
 *
 * Ejecuta este conector en tu computadora para permitir acceso seguro y controlado
 * a carpetas y proyectos autorizados desde la nube de AgentSystem.
 *
 * Requisitos: Node.js 18+ en Windows.
 * Uso:
 *   node windows-bridge.mjs --server=https://tu-applet-url.run.app --token=bridge_sec_agent_system_2026
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  acc[k] = v;
  return acc;
}, {});

const SERVER_URL = (args.server || process.env.AGENTSYSTEM_URL || 'http://localhost:3000').replace(/\/+$/, '');
const TOKEN = args.token || process.env.LOCAL_BRIDGE_SECRET || 'bridge_sec_agent_system_2026';
const ALLOWED_DIRS = (args.dirs ? args.dirs.split(',') : [
  path.join(os.homedir(), 'Proyectos'),
  path.join(os.homedir(), 'AgentSystem-Workspace')
]).map(d => path.resolve(d));

console.log('====================================================');
console.log('🚀 AgentSystem — Local Bridge Client (Windows)');
console.log('====================================================');
console.log(`📡 Servidor Cloud: ${SERVER_URL}`);
console.log(`📁 Carpetas locales autorizadas:`);
ALLOWED_DIRS.forEach(d => console.log(`   - ${d}`));
console.log('🔒 Modo de seguridad: Conexión saliente cifrada (sin puertos abiertos)');
console.log('====================================================\n');

async function sendHeartbeat() {
  try {
    const res = await fetch(`${SERVER_URL}/api/bridge/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        allowedDirectories: ALLOWED_DIRS
      })
    });
    if (res.ok) {
      console.log(`[${new Date().toLocaleTimeString()}] ✔ Heartbeat sincronizado con la nube.`);
    }
  } catch (err) {
    console.warn(`[${new Date().toLocaleTimeString()}] ⚠ Enlace esperando servidor cloud: ${err.message}`);
  }
}

// Initial pulse and periodic ping
sendHeartbeat();
setInterval(sendHeartbeat, 30000);
