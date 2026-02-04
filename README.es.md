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
  <img src="docs/ai-rules-architecture.svg" alt="Arquitectura Multi-Agente de Codingbuddy" width="800"/>
</p>

## Equipo de Expertos IA para Tu Código

**Codingbuddy orquesta 29 agentes de IA especializados para ofrecer calidad de código a nivel de equipo de expertos humanos.**

Una sola IA no puede ser experta en todo. Codingbuddy crea un equipo de desarrollo de IA—arquitectos, desarrolladores, especialistas en seguridad, expertos en accesibilidad y más—que colaboran para revisar, verificar y refinar tu código hasta que cumpla con los estándares profesionales.

---

## La Visión

### El Problema

Cuando le pides a una IA que escriba código, obtienes una única perspectiva. Sin revisión de seguridad. Sin verificación de accesibilidad. Sin validación de arquitectura. Solo una IA haciendo todo "aceptable" pero nada excelente.

Los equipos de desarrollo humanos tienen especialistas:
- **Arquitectos** que diseñan sistemas
- **Ingenieros de seguridad** que encuentran vulnerabilidades
- **Especialistas en QA** que detectan casos límite
- **Expertos en rendimiento** que optimizan cuellos de botella

### Nuestra Solución

**Codingbuddy trae el modelo de equipo especializado a la programación con IA.**

En lugar de que una sola IA intente hacerlo todo, Codingbuddy coordina múltiples agentes especializados que colaboran:

```
┌─────────────────────────────────────────────────────────────┐
│                       Tu Solicitud                           │
│              "Implementar autenticación de usuario"          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 📋 PLAN: Arquitecto de Soluciones + Especialista en Arquitectura│
│          → Diseñar arquitectura del sistema                  │
│          → Definir requisitos de seguridad                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🚀 ACT: Desarrollador Backend + Especialista en Estrategia de Tests│
│         → Implementar con TDD                                │
│         → Seguir estándares de calidad                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 🔍 EVAL: Revisor de Código + Especialistas en Paralelo       │
│          🔒 Seguridad    → ¿Vulnerabilidades JWT?            │
│          ♿ Accesibilidad → ¿Cumplimiento WCAG?              │
│          ⚡ Rendimiento  → ¿Optimización necesaria?          │
│          📏 Calidad      → ¿Principios SOLID?                │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        Critical > 0?              Critical = 0 AND
        High > 0?                  High = 0
              │                           │
              ▼                           ▼
        Volver a PLAN              ✅ Calidad Alcanzada
        con mejoras                Desplegar con confianza
```

---

## Arquitectura Multi-Agente

### Sistema de Agentes de 3 Niveles

| Nivel | Agentes | Rol |
|-------|---------|-----|
| **Agentes de Modo** | plan-mode, act-mode, eval-mode | Orquestación de flujo de trabajo |
| **Agentes Principales** | solution-architect, frontend-developer, backend-developer, code-reviewer, +8 más | Implementación central |
| **Agentes Especialistas** | security, accessibility, performance, test-strategy, +15 más | Experiencia de dominio |

### Ejemplo de Colaboración de Agentes

Cuando solicitas una funcionalidad, los agentes colaboran automáticamente:

```
🤖 solution-architect    → Diseña el enfoque
   └── 👤 architecture-specialist  → Valida límites de capas
   └── 👤 test-strategy-specialist → Planifica cobertura de tests

🤖 backend-developer     → Implementa el código
   └── 👤 security-specialist      → Revisa patrones de auth
   └── 👤 event-architecture       → Diseña flujos de mensajes

🤖 code-reviewer         → Evalúa calidad
   └── 👤 4 especialistas en paralelo → Revisión multidimensional
```

---

## Ciclo de Aseguramiento de Calidad

### El Bucle PLAN → ACT → EVAL

Codingbuddy implementa un ciclo de desarrollo orientado a la calidad:

1. **PLAN**: Diseñar antes de codificar (arquitectura, estrategia de tests)
2. **ACT**: Implementar con TDD y estándares de calidad
3. **EVAL**: Revisión multi-especialista (seguridad, rendimiento, accesibilidad, calidad)
4. **Iterar**: Continuar hasta alcanzar objetivos de calidad

### Modo AUTO: Logro Autónomo de Calidad

```bash
# Solo describe lo que quieres
AUTO: Implementar autenticación JWT con tokens de refresco

# Codingbuddy automáticamente:
# → Planifica la implementación
# → Escribe código siguiendo TDD
# → Revisa con 4+ especialistas
# → Itera hasta: Critical=0 AND High=0
# → Entrega código listo para producción
```

### Criterios de Salida

| Severidad | Debe Corregirse Antes de Desplegar |
|-----------|-----------------------------------|
| 🔴 Critical | Sí - Problemas inmediatos de seguridad/datos |
| 🟠 High | Sí - Problemas significativos |
| 🟡 Medium | Opcional - Deuda técnica |
| 🟢 Low | Opcional - Mejora |

---

## Lo Que Lo Hace Diferente

| Programación IA Tradicional | Codingbuddy |
|----------------------------|-------------|
| Perspectiva de una sola IA | 29 perspectivas de agentes especialistas |
| "Generar y esperar" | Planificar → Implementar → Verificar |
| Sin puertas de calidad | Critical=0, High=0 requerido |
| Revisión manual necesaria | Revisión multidimensional automatizada |
| Calidad inconsistente | Refinamiento iterativo hasta cumplir estándares |

---

## Inicio Rápido

### Prerrequisitos

- **Node.js** 18.x o superior
- **npm** 9.x+ o **yarn** 4.x+
- Una herramienta de IA compatible (Claude Code, Cursor, GitHub Copilot, etc.)

### Instalación

```bash
# Inicializa tu proyecto
npx codingbuddy init

# Añade a la configuración de Claude Desktop
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json
```

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

### Comenzar a Usar

```
PLAN: Implementar registro de usuario con verificación de email
→ El equipo IA planifica la arquitectura

ACT
→ El equipo IA implementa con TDD

EVAL
→ El equipo IA revisa desde 8+ perspectivas

AUTO: Construir un sistema de autenticación completo
→ El equipo IA itera hasta alcanzar la calidad
```

[Guía Completa de Inicio →](docs/es/getting-started.md)

### Plugin de Claude Code (Opcional)

Para integración mejorada con Claude Code:

```bash
# Añadir el marketplace
claude marketplace add JeremyDev87/codingbuddy

# Instalar el plugin
claude plugin install codingbuddy@jeremydev87

# Instalar servidor MCP para funcionalidad completa
npm install -g codingbuddy
```

| Documentación | Descripción |
|---------------|-------------|
| [Guía de Configuración del Plugin](docs/plugin-guide.md) | Instalación y configuración |
| [Referencia Rápida](docs/plugin-quick-reference.md) | Comandos y modos de un vistazo |
| [Arquitectura](docs/plugin-architecture.md) | Cómo funcionan juntos plugin y MCP |

---

## Herramientas de IA Compatibles

| Herramienta | Estado |
|-------------|--------|
| Claude Code | ✅ MCP Completo + Plugin |
| Cursor | ✅ Compatible |
| GitHub Copilot | ✅ Compatible |
| Antigravity | ✅ Compatible |
| Amazon Q | ✅ Compatible |
| Kiro | ✅ Compatible |
| OpenCode | ✅ Compatible |

[Guías de Configuración →](docs/es/supported-tools.md)

---

## Configuración

### Configuración del Modelo de IA

Configure el modelo de IA predeterminado en `codingbuddy.config.js`:

```javascript
module.exports = {
  ai: {
    defaultModel: 'claude-sonnet-4-20250514', // Predeterminado
    // Opciones: claude-opus-4-*, claude-sonnet-4-*, claude-haiku-3-5-*
  }
}
```

| Modelo | Mejor Para |
|--------|------------|
| `claude-opus-4-*` | Arquitectura compleja, análisis profundo |
| `claude-sonnet-4-*` | Desarrollo general (predeterminado) |
| `claude-haiku-3-5-*` | Consultas rápidas (no recomendado para codificación) |

### Configuración de Verbosidad

Optimice el uso de tokens con niveles de verbosidad:

```javascript
module.exports = {
  verbosity: 'compact', // Opciones: 'minimal', 'compact', 'standard', 'detailed'
}
```

| Nivel | Caso de Uso |
|-------|-------------|
| `minimal` | Máximo ahorro de tokens, solo información esencial |
| `compact` | Equilibrado, formato reducido (predeterminado) |
| `standard` | Formato completo, respuestas estructuradas |
| `detailed` | Explicaciones extendidas, ejemplos incluidos |

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Primeros Pasos](docs/es/getting-started.md) | Instalación y configuración rápida |
| [Filosofía](docs/es/philosophy.md) | Visión y principios de diseño |
| [Sistema de Agentes](packages/rules/.ai-rules/agents/README.md) | Referencia completa de agentes |
| [Herramientas Compatibles](docs/es/supported-tools.md) | Guías de integración de herramientas IA |
| [Configuración](docs/config-schema.md) | Opciones del archivo de configuración |
| [Referencia API](docs/api.md) | Capacidades del servidor MCP |

---

## Contribuir

¡Damos la bienvenida a las contribuciones! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para las directrices.

## Licencia

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
