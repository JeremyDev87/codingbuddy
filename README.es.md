<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/ai-rules-architecture.svg" alt="Codingbuddy AI Rules Architecture" width="800"/>
</p>

**Una única fuente de verdad para reglas de codificación AI en todos los asistentes de IA.**

Codingbuddy proporciona un sistema de reglas unificado que funciona con Cursor, Claude Code, GitHub Copilot y más, para que todo tu equipo siga los mismos estándares de codificación, independientemente de la herramienta de IA que utilicen.

## ¿Por qué Codingbuddy?

- **Consistencia**: Todas las herramientas de IA siguen estándares de codificación idénticos
- **Fuente única de verdad**: Actualiza las reglas una vez, todas las herramientas se benefician
- **Sin dependencia de proveedor**: Reglas agnósticas de IA que funcionan con cualquier asistente
- **Flujo de trabajo estructurado**: Ciclo de desarrollo PLAN → ACT → EVAL

## Inicio rápido

```bash
# Inicializa tu proyecto (no requiere API key)
npx codingbuddy init

# Opcional: Inicialización con IA para un análisis más profundo
# npx codingbuddy init --ai  # Requiere ANTHROPIC_API_KEY

# Añade a tu herramienta de IA (ejemplo: Claude Desktop)
# Consulta docs/es/supported-tools.md para otras herramientas de IA
```

Añade a la configuración de Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

[Guía completa de inicio →](docs/es/getting-started.md)

## Herramientas de IA compatibles

| Herramienta | Estado |
|-------------|--------|
| Claude Code | ✅ Soporte MCP completo |
| Cursor | ✅ Compatible |
| GitHub Copilot | ✅ Compatible |
| Antigravity | ✅ Compatible |
| Amazon Q | ✅ Compatible |
| Kiro | ✅ Compatible |
| OpenCode | ✅ Compatible |

[Guías de configuración →](docs/es/supported-tools.md)

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Primeros pasos](docs/es/getting-started.md) | Instalación y configuración rápida |
| [Filosofía](docs/es/philosophy.md) | Visión y principios de diseño |
| [Herramientas compatibles](docs/es/supported-tools.md) | Guías de integración de herramientas IA |
| [Configuración](docs/config-schema.md) | Opciones del archivo de configuración |
| [Referencia API](docs/api.md) | Capacidades del servidor MCP |
| [Desarrollo](docs/development.md) | Contribuir y configuración local |

## Cómo funciona

Consulta el diagrama de arquitectura de arriba para una visión general del sistema de agentes de 3 capas:

- **Layer 1 (Agentes de Modo)**: Ciclo de flujo de trabajo PLAN → ACT → EVAL
- **Layer 2 (Agentes Principales)**: Frontend/Backend Developer, Code Reviewer, DevOps
- **Layer 3 (Especialistas)**: 9 expertos de dominio (Seguridad, Rendimiento, Accesibilidad, etc.)
- **Habilidades**: Capacidades reutilizables (TDD, Depuración, Brainstorming, etc.)

Todas las configuraciones de herramientas de IA referencian el mismo directorio `packages/rules/.ai-rules/`. Cambia las reglas una vez, y todas las herramientas siguen los estándares actualizados.

## Contribuir

¡Damos la bienvenida a las contribuciones! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las directrices.

## Licencia

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
