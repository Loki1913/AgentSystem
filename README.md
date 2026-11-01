# AgentSystem

**Plataforma autónoma de agentes de inteligencia artificial** con arquitectura multiagente, OpenRouter, gestión aislada de workspace y worker de navegador Playwright.

## Capacidades Principales

- **Orquestación Multiagente**: División automática de objetivos en planes de ejecución y coordinación entre especialistas:
  - 🎯 **Orchestrator Agent**: Planificación estructurada y supervisión.
  - 🔍 **Research Agent**: Investigación web con fuentes verificadas y prevención de alucinaciones.
  - 💻 **Coding Agent**: Inspección de proyectos, modificaciones atómicas, diffs y rollback en `workspace/`.
  - 👁️ **Vision Agent**: Análisis multimodal de capturas, diagramas y mockups.
  - 🌐 **Browser Agent**: Inspección de páginas web públicas, formularios y enlaces.
  - 🛡️ **Security Agent**: Auditoría contra vulnerabilidades OWASP y detección de secretos expuestos.
  - ✅ **QA Agent**: Validación de entregables, cumplimiento de requisitos y control de calidad.
- **Memoria Multinivel**:
  - Memoria de tarea en tiempo de ejecución.
  - Memoria persistente de proyecto (`storage/project_memory.json`).
  - Base de conocimientos investigados (`storage/knowledge_base.json`).
  - Registro de auditoría de tareas (`storage/tasks.jsonl`).
- **Gateway de Modelos**:
  - Compatible con OpenRouter y catálogo de modelos gratuitos (`meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen-2.5-coder-32b-instruct:free`, `google/gemini-2.0-flash-exp:free`).
  - Motor autónomo de razonamiento local de respaldo integrado.
- **Seguridad Robusta**:
  - Protección anti-SSRF con validación de IPs privadas.
  - Confinamiento estricto en carpeta aislada `workspace/`.
  - Copias de seguridad automáticas para rollback de archivos modificados.

## Inicio Rápido

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. (Opcional) Define tu clave `OPENROUTER_API_KEY` en `.env` para usar modelos LLM remotos. El sistema opera de forma autónoma con su motor integrado si no se define.
3. Instala dependencias y compila:
   ```bash
   npm install
   npm run build
   ```
4. Ejecuta las pruebas automatizadas:
   ```bash
   npm test
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Documentación

- [Arquitectura y Seguridad](docs/ARCHITECTURE.md)
- [Hoja de Ruta](docs/ROADMAP.md)
- [Herramientas y Permisos](docs/TOOLS.md)
- [Batería de Pruebas](tests/README.md)
