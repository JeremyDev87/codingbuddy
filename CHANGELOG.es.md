# Registro de Cambios

Todos los cambios notables de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/spec/v2.0.0.html).

## [5.1.3] - 2026-04-01

### Agregado
- **Puente de archivo TUI**: Puente basado en `fs.watch` para actualizaciones de la barra lateral TUI en modo stdio (#1104, #1105)
- **Actualización automática del marketplace**: Hook session-start auto-fetch del clon del marketplace con limitación de 24h (#1101, #1107)
- **Configuración automática MCP**: Creación automática de `~/.claude/mcp.json` al inicio de sesión para conectividad MCP (#1100, #1106)

### Corregido
- **Directorio lib/ del hook**: session-start ahora copia `lib/` junto al archivo del hook, corrigiendo las actualizaciones de estado HUD (#1102, #1103)
- **mcp.json faltante**: Las herramientas MCP ya no están indisponibles después de instalar el plugin (#1100, #1106)

## [5.1.2] - 2026-03-29

### Agregado
- **StatusLine HUD**: Métricas de sesión en tiempo real en la UI de Claude Code (modo, costo, tasa de caché, uso de contexto)
- **Barra lateral tmux**: Configuración automática del panel TUI como barra lateral en tmux
- **Herramienta `validate_plugin_manifest`**: Validación de plugin.json de Claude Code contra esquema conocido con sugerencias de corrección
- **Herramienta `pre_release_check`**: Validación pre-lanzamiento con detección automática de ecosistema (Node.js, Python, Go, Rust, Java)
- **Dominio de checklist de lanzamiento**: 10 elementos para consistencia de versiones, sincronización de lockfile, validación de manifiesto, puerta de calidad CI
- **Esquema de configuración de lanzamiento**: Sección `release` en codingbuddy.config.json
- **Detección de lanzamiento en EVAL**: Inclusión automática del checklist de lanzamiento cuando se detectan palabras clave relacionadas con versiones en modo EVAL/AUTO
- **Validación de esquema CI**: Validación de JSON Schema de plugin.json y marketplace.json en el flujo de trabajo dev
- **Módulo de estado HUD**: Gestión de estado entre hooks para statusLine y detección de modo

### Corregido
- `bump-version.sh` ahora ejecuta `yarn install` para prevenir desviación del lockfile después de cambios en peerDependencies

### Cambiado
- `CODINGBUDDY_AUTO_TUI` por defecto es `0` — la barra lateral tmux reemplaza el TUI independiente para usuarios de Claude Code

## [4.4.0] - 2026-03-04

### Agregado

- **Modelo**: Agregar soporte de modelos multi-proveedor con prefijos a nivel de proveedor
- **MCP**: Agregar detección de tipo de cliente para opencode/crush y cursor con hints de agentes paralelos específicos por plataforma
- **MCP**: Agregar hint de encadenamiento `get_skill` a la herramienta `recommend_skills`
- **MCP**: Agregar hint de despacho secuencial de especialistas específico para opencode
- **MCP**: Agregar diagnóstico `projectRootWarning` a `parse_mode`
- **Config**: Rastrear fuente de resolución de raíz del proyecto
- **Habilidades**: Agregar 12 nuevas definiciones de habilidades (security-audit, documentation-generation, code-explanation, tech-debt, agent-design, rule-authoring, mcp-builder, context-management, deployment-checklist, error-analysis, legacy-modernization, prompt-engineering)
- **Habilidades**: Agregar disparadores de palabras clave i18n para 12 habilidades (KO/JA/ZH/ES)

### Corregido

- **Habilidades**: Alinear ejemplos JSON de habilidad agent-design con `agent.schema.json`

### Pruebas

- Agregar pruebas de detección de tipo de cliente y ramificación de hints
- Agregar pruebas de nextAction y hint de encadenamiento de `recommend_skills`
- Agregar pruebas de disparadores de palabras clave para 12 habilidades

### Documentación

- Auditar y mejorar documentación de adaptadores para Codex, Antigravity, Kiro, OpenCode y Cursor
- Agregar documentación de configuración MCP y detección de raíz del proyecto en todos los adaptadores
- Agregar patrones de ejecución de agentes especialistas en todos los adaptadores
- Reorganizar catálogo de habilidades con tablas categorizadas

## [4.3.0] - 2026-02-20

### Agregado

- **TUI FlowMap**: Reemplazar flechas en curva U con conectores de árbol para mejor visualización de jerarquía de agentes (#574)
- **TUI FlowMap**: Conectar `activeStage` y agregar estadísticas de agentes por etapa (#571)
- **TUI FlowMap**: Agregar bandera `isParallel` y visualización de modo de ejecución en nodos de agente (#550)
- **TUI FlowMap**: Extender `renderAgentTree` para soportar renderizado de subárbol de agentes multinivel (#557)
- **TUI ActivityVisualizer**: Rediseñar paneles Activity y Live para mayor claridad (#551)
- **TUI Pie de página**: Rastrear y mostrar conteos de invocaciones de Agent, Skill y Tool
- **TUI ChecklistPanel**: Separar `ChecklistPanel` de `FocusedAgentPanel` para visualización independiente (#548)
- **TUI Visibilidad de Agente**: Reemplazar visualización centrada en herramientas con visibilidad real del agente (#549)
- **TUI Reinicio**: Implementar capacidad de reinicio de TUI via herramienta MCP y flag CLI (#545)
- **Agentes**: Agregar `software-engineer` como agente ACT predeterminado (#568)
- **Agentes**: Agregar `data-scientist` como agente ACT principal (#566)
- **Agentes**: Agregar `systems-developer` como agente ACT principal (#565)
- **Agentes**: Agregar `security-engineer` como agente ACT principal
- **Agentes**: Agregar `test-engineer` como agente ACT principal (#563)
- **Patrones de Palabras Clave**: Agregar patrones de refactorización y definición de tipos a la detección de palabras clave del backend (#567)

### Corregido

- **TUI FlowMap**: Mostrar valores de progreso intermedios en barras de progreso (#572)
- **TUI FlowMap**: Eliminar agentes obsoletos de FlowMap tras completarse (#570)
- **TUI HeaderBar**: Corregir desbordamiento de barra de encabezado, visualización de ruta de workspace y eliminar prefijo `sess:` (#547)
- **Tipos de Palabras Clave**: Agregar `ai-ml-engineer` a `ACT_PRIMARY_AGENTS` (#562)
- **Manejador de Modo**: Auto-heredar `recommendedActAgent` del contexto en modo ACT (#561)

## [4.2.0] - 2026-02-18

### Agregado

- **TUI Multi-Sesión**: Soporte multi-sesión y apertura automática de TUI en conexión MCP (#485)
- **TUI Auto-Lanzamiento**: Habilitación de auto-lanzamiento mediante flag `--tui` (#522)
- **TUI ActivityVisualizer**: Reemplazo de MonitorPanel con panel ActivityVisualizer (#482)
- **TUI FlowMap**: Jerarquía visual mejorada, encabezado de pipeline y barras de progreso (#468)
- **TUI MonitorPanel**: Registro de eventos, cronología de agentes y progreso de tareas
- **TUI Objetivos**: Integración de objetivos desde respuesta de `parse_mode` (#473)
- **TUI Eventos**: Evento SKILL_RECOMMENDED en estado del dashboard (#474)
- **TUI Eventos**: Pre-registro de especialistas en evento PARALLEL_STARTED (#475)
- **TUI Eventos**: Sincronización de etapa del agente activo en MODE_CHANGED (#476)
- **TUI Eventos**: Extracción de `recommended_act_agent` y `parallelAgentsRecommendation` de `parse_mode` (#477)
- **TUI Progreso**: Estimación de progreso mediante conteo TOOL_INVOKED (#472)
- **TUI Diseño**: Ancho del panel FocusedAgent duplicado (#466)
- **TUI Diseño**: Sistema de diseño de cuadrícula precisa (#458)
- **TUI Diseño**: FocusedAgent de ancho fijo alineado a la derecha con FlowMap responsivo (#462)
- **TUI StageHealthBar**: Conteo de invocación de herramientas en tiempo real reemplaza tokenCount fijo (#490)
- **TUI Lista de verificación**: Lista inicial desde `parse_mode` y seguimiento de completitud mejorado (#504)
- **TUI FocusedAgent**: Avatar, sparkline y barra de progreso mejorada (#505)
- **TUI Tema**: Colores de borde de paneles unificados mediante constante BORDER_COLORS (#494)
- **TUI Contexto**: Decisiones/notas de context:updated en FocusedAgentPanel (#515)
- **TUI Sesión**: Reinicio del estado del dashboard en comando `/clear` via evento SESSION_RESET (#499)
- **Config**: Reglas de prioridad de herramientas y sección CLAUDE.md para codingbuddy MCP (#516, #512)
- **Servidor MCP**: Reglas de continuidad de ejecución TDD para prevenir detención en fase RED (#463)
- **GitHub**: Revisión de código Copilot con instrucciones personalizadas (#460)
- **Docs**: Guía de solución de problemas TUI para problemas de inicio de auto-lanzamiento (#520)

### Cambiado

- **TUI Actividad**: Mapa de calor de Activity reemplazado por gráfico de barras horizontal (#517)
- **TUI Diseño**: Ancho del panel FocusedAgent reducido ~10% y paneles Activity/FlowMap expandidos (#501)
- **TUI Tareas**: task:synced consolidado en un solo paso y orden de eventos corregido (#504)

### Corregido

- **TUI HeaderBar**: Modo AUTO mostrado incorrectamente como paso secuencial en el flujo de proceso (#488)
- **TUI Tareas**: Panel de tareas sin datos en modos PLAN/EVAL (#492)
- **TUI Live**: Panel Live con casi ningún dato — burbujas de ventana de tiempo reemplazadas con `renderLiveContext` (#502)
- **TUI Progreso**: Porcentaje de progreso bloqueado en 0% por incompatibilidad de agentId (#503)
- **TUI AutoLauncher**: Resolución de ruta absoluta del binario en TuiAutoLauncher (#519)
- **Build**: TUI bundle incluido en script de compilación principal para evitar exportaciones obsoletas
- **Config**: Exclusión de `.next` y artefactos de build en prettier y tsconfig (#496)

### Eliminado

- **Servidor MCP**: Código no utilizado y exportaciones muertas (#486)
- **TUI**: Funciones deprecadas de text-formatter de componentes puros

## [4.1.0] - 2026-02-17

### Agregado

- **Panel TUI**: UI de terminal basada en Ink (componentes Header, AgentCard, AgentTree, AgentGrid, StatusBar, ProgressBar)
- **TUI EventBus**: Sistema de eventos basado en EventEmitter2 con hooks React `useEventBus` y `useAgentState`
- **TUI IPC**: Proceso independiente con comunicación interprocesos via Unix Domain Socket
- **Diseño TUI Compacto**: Diseño de línea única optimizado para terminales de 24 líneas
- **TUI Interceptor**: Capa de despacho de herramientas MCP para actualizaciones de UI en tiempo real
- **Página de Destino**: Página de destino multilingüe (5 idiomas) basada en Next.js 16
  - Arquitectura Widget Slot (widgets AgentsShowcase, CodeExample, QuickStart)
  - Biblioteca de componentes shadcn/ui con temas y consentimiento de cookies
  - Fuentes auto-hospedadas via `next/font`
  - Configuración i18n next-intl con rutas paralelas y diseño de slot de localización
  - Secciones estáticas: Hero, Problem, Solution, FAQ
  - Encabezado (selector de idioma, alternador de tema), Footer y mejoras de accesibilidad
  - Configuración de despliegue en Vercel con integración de analíticas
  - Datos estructurados JSON-LD para SEO (#424)
  - Declaración de accesibilidad WCAG 2.1 AA
- **MCP Server**: Autenticación Bearer token para endpoints SSE (#416)
- **Sistema de Agentes**: Herramienta `dispatch_agents` y auto-despacho en respuesta `parse_mode` (#328)
- **Patrones de Intent**: Patrones de intent `frontend-developer` y `devops-engineer` añadidos
- **Modo EVAL**: Soporte de `recommendedActAgent` en modo EVAL (#361)

### Cambiado

- **Prettier**: Reformateo de toda la base de código con `printWidth: 100` (#423)
- **MCP Server**: Extracción de módulos compartidos `rules-core` y `keyword-core` (#415)
- **Plugin**: Eliminación de `syncVersion` duplicado del script de build (#418)

### Corregido

- plugin `isPathSafe()` normalización de rutas y coincidencia insensible a mayúsculas (#419)
- MCP server lógica de fusión `findLastIndex` en `appendContext` (#410)
- MCP server manejador de rechazo de Promise no capturada en `bootstrap()`
- MCP server validación en tiempo de ejecución de type assertion inseguras (#411)
- Página de destino atributo `html lang` establecido desde locale en renderizado del servidor (#412)
- Página de destino eliminación del meta-paquete radix-ui, uso directo de `@radix-ui/react-dialog` (#413)
- `validate-rules.sh` referencia de ruta `.ai-rules` actualizada (#422)
- Resolución basada en intent de keyword omite project config en modo recomendación
- plugin corrección de typo `codebuddy` → `codingbuddy`
- CI release-drafter fijado a SHA y versiones de setup action alineadas

### Documentación

- Guía de usuario TUI, arquitectura y documentación de resolución de problemas
- README de página de destino con guía de despliegue y estructura del proyecto
- Corrección de desajuste en conteo de agentes en la documentación (#421)
- Documentación de variable de entorno MCP_SSE_TOKEN (#416)
- Plan de implementación JSON-LD (#424)

### Pruebas

- Pruebas de context-document handler (#417)
- Pruebas de integración TUI EventBus-UI, App root y transport
- Pruebas de verificación de rendimiento y estabilidad TUI
- Pruebas de root layout y CSP headers de página de destino
- Pruebas de async server component de página de destino

---

## [4.0.1] - 2026-02-04

### Agregado

- Verificación automática de consistencia de versiones para prevenir desajustes entre package.json y etiquetas git (#305)
- Nuevo script de verificación (`scripts/verify-release-versions.sh`) con mensajes de error claros e instrucciones de corrección

### Cambiado

- Flujo de trabajo de lanzamiento actualizado con paso de verificación fail-fast
- Documentación README de claude-code-plugin simplificada

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
