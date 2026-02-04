# Registro de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/spec/v2.0.0.html).

## [4.0.0] - 2026-02-03

### ⚠️ Cambios Incompatibles (Breaking Changes)

#### Cambio en la Prioridad de Resolución de Modelos

**Antes (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**Después (v4.0.0)**:
1. Global Config → `ai.defaultModel` (máxima prioridad)
2. System Default

#### Formato de archivo de configuración cambiado a solo JSON

**Antes (v3.x)**: Se soportaban tanto `codingbuddy.config.js` como `codingbuddy.config.json`

**Después (v4.0.0)**: Solo se soporta `codingbuddy.config.json`

**Motivo**: Los archivos de configuración JavaScript no se pueden cargar en proyectos ESM (`'type': 'module'`), causando que el servidor MCP no encuentre la configuración de idioma. El formato JSON es independiente del sistema de módulos.

**Migración**: Convierte el `codingbuddy.config.js` existente al formato `.json`:
- Elimina el envoltorio `module.exports`
- Usa comillas dobles para claves y cadenas
- Elimina las comas finales

**Antes**:
```javascript
module.exports = {
  language: 'es',
}
```

**Después**:
```json
{
  "language": "es"
}
```

#### Opciones CLI eliminadas

- Opción `--format` eliminada del comando `codingbuddy init` (JSON es ahora el único formato)

#### Guía de Migración

1. **No se requiere acción si usa configuración global**: Si ya configuró `ai.defaultModel` en `codingbuddy.config.json`, su configuración seguirá funcionando.

2. **Los campos model en Agent JSON ahora se ignoran**: Si personalizó las preferencias de modelo de agente en `packages/rules/.ai-rules/agents/*.json`, esa configuración ya no se aplica. Use `codingbuddy.config.json` en su lugar:

**codingbuddy.config.json**:
```json
{
  "ai": {
    "defaultModel": "claude-opus-4-20250514"
  }
}
```

#### APIs Eliminadas

- `ModelResolverService.resolveForMode()` → Use `resolve()` en su lugar
- `ModelResolverService.resolveForAgent()` → Use `resolve()` en su lugar
- Tipo `ModelSource`: variantes `'agent'` y `'mode'` eliminadas
- `ResolveModelParams`: parámetros `agentModel` y `modeModel` eliminados

### Añadido

- **Sistema de Verbosidad**: Formateo de respuestas optimizado para tokens con niveles de verbosidad configurables (`minimal`, `compact`, `standard`, `detailed`)
- **Habilidad PR All-in-One**: Flujo de trabajo unificado de pull request que combina revisión, aprobación y fusión
- **Clasificador de Complejidad SRP**: Soporte multilenguaje para análisis del Principio de Responsabilidad Única

### Cambiado

- Módulo de sesión obsoleto eliminado y referencias limpiadas
- Migración de Dependabot a Renovate para gestión de dependencias
- Todas las dependencias fijadas a versiones exactas para reproducibilidad

---

## [3.1.1] - 2026-01-27

### Añadido

- Auto-inclusión de habilidades y agentes en la respuesta de parse_mode

### Corregido

- El flujo de trabajo de CI ahora asegura que los PRs de Dependabot incluyan actualizaciones de yarn.lock

---

## [3.1.0] - 2026-01-20

### Añadido

- Clasificador de complejidad SRP con soporte multilenguaje
- Documentación de guía de plugin para todos los idiomas soportados
