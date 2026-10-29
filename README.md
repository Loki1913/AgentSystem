# AgentSystem

**Espacio personal de agentes de IA** con PHP, Neuron AI, OpenRouter y un worker Playwright separado.

> **Estado actual:** prototipo funcional en desarrollo. La base, los modos de tarea y las herramientas iniciales están implementados; la integración real con una cuenta de OpenRouter y el worker de navegador todavía debe probarse en el equipo del usuario.

## Funciones implementadas
- Interfaz local en español con modos General, Investigación, Visión, Programación y Navegador.
- Neuron AI como agente para el modo general.
- Gateway OpenRouter configurable y modelo multimodal opcional.
- Investigación con resultados web, extracción limitada de páginas HTTPS y enlaces de fuentes.
- Entrada de imágenes para modelos multimodales.
- Llamadas a herramientas limitadas por modo y máximo de rondas.
- Workspace aislado con lectura/listado y escritura opcional, habilitada explícitamente.
- Worker Node.js + Playwright para inspección de solo lectura, extracción de texto y captura de pantalla.
- Historial local que registra solo metadatos de las tareas, no los prompts ni las respuestas.
- GitHub Actions para validar Composer, sintaxis PHP, pruebas smoke y sintaxis Node.

## Limitaciones actuales
- No opera libremente las aplicaciones del escritorio ni controla sesiones autenticadas.
- El navegador no hace clic, rellena formularios ni envía información.
- No ejecuta comandos arbitrarios ni código generado.
- Algunos modelos gratuitos no admiten visión o llamadas a herramientas, y sus cuotas cambian.
- La búsqueda web es experimental y sus resultados deben verificarse en las fuentes originales.
- No se ha probado todavía una llamada real a OpenRouter desde el equipo del usuario.

## Inicio rápido (Windows)
Requisitos: PHP 8.2+ con `curl`, `mbstring` y `dom`; Composer 2. Para el navegador: Node.js 20+.

1. Copia `.env.example` a `.env`.
2. Define `OPENROUTER_API_KEY` y `OPENROUTER_MODEL`. Opcionalmente define `OPENROUTER_VISION_MODEL`.
3. Ejecuta `composer install`.
4. Ejecuta `php tests/smoke.php`.
5. Ejecuta `php -S 127.0.0.1:8080 -t public`.
6. Abre http://127.0.0.1:8080.

Para configurar Playwright, sigue [docs/SETUP-WINDOWS.md](docs/SETUP-WINDOWS.md). Nunca subas `.env` ni compartas la clave.

## Documentación
- [Arquitectura](docs/ARCHITECTURE.md)
- [Hoja de ruta](docs/ROADMAP.md)
- [Herramientas y permisos](docs/TOOLS.md)
- [Instalación en Windows](docs/SETUP-WINDOWS.md)
