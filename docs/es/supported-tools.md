<p align="center">
  <a href="../supported-tools.md">English</a> |
  <a href="../ko/supported-tools.md">한국어</a> |
  <a href="../zh-CN/supported-tools.md">中文</a> |
  <a href="../ja/supported-tools.md">日本語</a> |
  <a href="supported-tools.md">Español</a>
</p>

# Herramientas de IA compatibles

Codingbuddy funciona con múltiples asistentes de codificación de IA a través de un sistema de reglas unificado.

## Resumen

| Herramienta | Método de integración | Guía de configuración |
|-------------|----------------------|----------------------|
| [Claude Code](#claude-code) | Servidor MCP | [Guía](../../packages/rules/.ai-rules/adapters/claude-code.md) |
| [Cursor](#cursor) | Directorio Rules | [Guía](../../packages/rules/.ai-rules/adapters/cursor.md) |
| [GitHub Copilot / Codex](#github-copilot--codex) | Archivo Instructions | [Guía](../../packages/rules/.ai-rules/adapters/codex.md) |
| [Antigravity](#antigravity) | Directorio Config | [Guía](../../packages/rules/.ai-rules/adapters/antigravity.md) |
| [Amazon Q](#amazon-q) | Directorio Rules | [Guía](../../packages/rules/.ai-rules/adapters/q.md) |
| [Kiro](#kiro) | Directorio Spec | [Guía](../../packages/rules/.ai-rules/adapters/kiro.md) |
| [OpenCode](#opencode) | Directorio Rules | [Guía](../../packages/rules/.ai-rules/adapters/opencode.md) |

## Claude Code

**Método de integración**: Servidor MCP (Model Context Protocol)

Claude Code se conecta a través de MCP, proporcionando acceso completo a la configuración del proyecto, reglas y agentes especialistas.

### Configuración rápida

1. Añadir a la configuración de Claude Desktop:

   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

2. Reiniciar Claude Desktop

### Características

- Acceso completo a recursos MCP (configuración, reglas, agentes)
- Llamadas a herramientas (search_rules, get_agent_details, parse_mode, recommend_skills)
- Plantillas de prompts (activate_agent)

[Guía completa](../../packages/rules/.ai-rules/adapters/claude-code.md)

## Cursor

**Método de integración**: Directorio Rules

Cursor usa `.cursor/rules/` para instrucciones específicas del proyecto.

### Configuración rápida

1. Crear directorio `.cursor/rules/`
2. Referenciar reglas comunes:

```markdown
<!-- .cursor/rules/codingbuddy.md -->

# Reglas del proyecto

Sigue las reglas comunes de `packages/rules/.ai-rules/`:

- Flujo de trabajo: @packages/rules/.ai-rules/rules/core.md
- Calidad: @packages/rules/.ai-rules/rules/augmented-coding.md
- Contexto: @packages/rules/.ai-rules/rules/project.md
```

### Características

- Referencia de archivos con sintaxis `@`
- Personalización específica del proyecto
- Contexto de agentes a través de referencias de archivos

[Guía completa](../../packages/rules/.ai-rules/adapters/cursor.md)

## GitHub Copilot / Codex

**Método de integración**: Archivo Instructions

GitHub Copilot usa `.github/copilot-instructions.md` para instrucciones personalizadas.

### Configuración rápida

1. Crear archivo de instrucciones:

```markdown
<!-- .github/copilot-instructions.md -->

# Estándares de codificación

Sigue las directrices de `packages/rules/.ai-rules/rules/`:

## Flujo de trabajo
Usar flujo PLAN → ACT → EVAL definido en core.md

## Calidad de código
- Enfoque TDD (Red → Green → Refactor)
- TypeScript modo strict
- 80%+ cobertura de pruebas
```

### Características

- Instrucciones basadas en Markdown
- Configuración a nivel de repositorio
- Configuración compartida por equipo

[Guía completa](../../packages/rules/.ai-rules/adapters/codex.md)

## Antigravity

**Método de integración**: Directorio Config

Antigravity (basado en Gemini) usa `.antigravity/` para configuración.

### Configuración rápida

1. Crear directorio `.antigravity/rules/`
2. Añadir referencias de reglas:

```markdown
<!-- .antigravity/rules/project.md -->

# Directrices del proyecto

Referencia: packages/rules/.ai-rules/rules/core.md
Referencia: packages/rules/.ai-rules/rules/augmented-coding.md
```

### Características

- Integración con modelo Gemini
- Referencias de archivos de reglas
- Conciencia del contexto del proyecto

[Guía completa](../../packages/rules/.ai-rules/adapters/antigravity.md)

## Amazon Q

**Método de integración**: Directorio Rules

Amazon Q Developer usa `.q/rules/` para reglas personalizadas.

### Configuración rápida

1. Crear directorio `.q/rules/`
2. Añadir reglas de integración:

```markdown
<!-- .q/rules/codingbuddy.md -->

# Estándares de desarrollo

Sigue packages/rules/.ai-rules/ para prácticas de codificación consistentes.

Archivos clave:
- packages/rules/.ai-rules/rules/core.md (flujo de trabajo)
- packages/rules/.ai-rules/rules/augmented-coding.md (TDD)
```

### Características

- Integración con AWS
- Características empresariales
- Soporte de reglas personalizadas

[Guía completa](../../packages/rules/.ai-rules/adapters/q.md)

## Kiro

**Método de integración**: Directorio Spec

Kiro usa `.kiro/` para especificaciones y archivos de dirección.

### Configuración rápida

1. Crear directorio `.kiro/steering/`
2. Añadir archivo de dirección:

```markdown
<!-- .kiro/steering/codingbuddy.md -->

# Dirección del proyecto

Aplicar reglas de packages/rules/.ai-rules/:
- Modos de flujo de trabajo (PLAN/ACT/EVAL)
- Desarrollo TDD
- Estándares de calidad de código
```

### Características

- Desarrollo basado en especificaciones
- Sistema de archivos de dirección
- Integración de gestión de tareas

[Guía completa](../../packages/rules/.ai-rules/adapters/kiro.md)

## OpenCode

**Método de integración**: Configuración JSON

OpenCode (y su sucesor Crush de Charm Bracelet) utiliza archivos de configuración JSON con flujos de trabajo basados en agentes.

### Configuración rápida

1. Crear `.opencode.json` (o `crush.json`):

```json
{
  "instructions": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/augmented-coding.md"
  ],
  "agent": {
    "plan-mode": {
      "prompt": "{file:packages/rules/.ai-rules/agents/plan-mode.json}",
      "permission": { "edit": "deny" }
    },
    "act-mode": {
      "prompt": "{file:packages/rules/.ai-rules/agents/act-mode.json}",
      "permission": { "edit": "allow" }
    }
  },
  "mcp": {
    "codingbuddy": {
      "command": ["npx", "codingbuddy", "mcp"]
    }
  }
}
```

### Características

- Interfaz TUI nativa de terminal
- Flujo de trabajo PLAN/ACT/EVAL basado en agentes
- Integración con servidor MCP
- Control de permisos detallado

[Guía completa](../../packages/rules/.ai-rules/adapters/opencode.md)

## Añadir nuevas herramientas

Codingbuddy está diseñado para soportar herramientas de IA adicionales:

1. Crear guía de adaptador en `packages/rules/.ai-rules/adapters/{tool}.md`
2. Crear directorio de herramienta `.{tool}/`
3. Referenciar reglas comunes de `packages/rules/.ai-rules/`

Consulta [Guía de contribución](../../CONTRIBUTING.md) para más detalles.

## Comparación

| Característica | Claude | Cursor | Copilot | Antigravity | Q | Kiro | OpenCode |
|----------------|--------|--------|---------|-------------|---|------|----------|
| Soporte MCP | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Referencias de archivos | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Activación de agentes | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Configuración de proyecto | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |

✅ Soporte completo | ⚠️ Soporte parcial (vía referencias de archivos) | ❌ No soportado

## Próximos pasos

- [Primeros pasos](./getting-started.md) - Configuración inicial
- [Filosofía](./philosophy.md) - Principios de diseño
- [Referencia API](../api.md) - Capacidades MCP
