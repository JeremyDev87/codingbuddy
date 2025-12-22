<p align="center">
  <a href="../philosophy.md">English</a> |
  <a href="../ko/philosophy.md">한국어</a> |
  <a href="../zh-CN/philosophy.md">中文</a> |
  <a href="../ja/philosophy.md">日本語</a> |
  <a href="philosophy.md">Español</a>
</p>

# Filosofía

Este documento explica la visión, las creencias fundamentales y los principios de diseño de Codingbuddy.

## Visión

**Una única fuente de reglas de codificación de IA para todos los asistentes de IA**

Los equipos de desarrollo actuales utilizan múltiples herramientas de codificación con IA: Cursor, Claude Code, GitHub Copilot y más. Cada herramienta tiene su propio formato de configuración, lo que lleva a:

- Duplicación de reglas en múltiples archivos de configuración
- Estándares de codificación inconsistentes según la herramienta de IA utilizada
- Carga de mantenimiento al actualizar reglas

Codingbuddy resuelve esto proporcionando un sistema de reglas unificado compatible con cualquier asistente de IA.

## Creencias fundamentales

### 1. Reglas agnósticas de IA

Las reglas se escriben una vez y funcionan en todas partes. Sin dependencia de proveedores, sin sintaxis específica de herramientas en las reglas principales. Cada herramienta de IA se adapta al formato común a través de adaptadores ligeros.

### 2. Divulgación progresiva

Comienza simple, profundiza cuando sea necesario:

- **Inicio rápido**: Funcionando en 2 minutos con `npx codingbuddy init`
- **Configuración**: Personaliza stack tecnológico, arquitectura y convenciones
- **Agentes especialistas**: Accede a expertos de dominio (seguridad, rendimiento, accesibilidad)
- **Personalización completa**: Extiende con reglas específicas del proyecto

### 3. Convención sobre configuración

Valores predeterminados sensatos que funcionan para la mayoría de los proyectos:

- Flujo de trabajo PLAN → ACT → EVAL
- Enfoque de desarrollo TDD-first
- Objetivo de cobertura de pruebas del 80%+
- Principios SOLID y código limpio

Solo anula lo que necesites cambiar.

### 4. Estándares impulsados por la comunidad

Las mejores prácticas provienen de la experiencia del mundo real:

- Reglas basadas en patrones probados de bases de código en producción
- Agentes especialistas que codifican la experiencia de dominio de los profesionales
- Código abierto y abierto a contribuciones

## Principios de diseño

### Fuente única de verdad

```
packages/rules/.ai-rules/           ← Fuente autoritativa
├── rules/           ← Reglas principales (flujo de trabajo, calidad, proyecto)
├── agents/          ← Conocimiento especializado
└── adapters/        ← Guías de integración específicas por herramienta
```

Todas las configuraciones de herramientas de IA referencian `packages/rules/.ai-rules/`. Actualiza una vez, todas las herramientas se benefician.

### Separación de responsabilidades

| Capa | Propósito | Formato |
|------|-----------|---------|
| **Rules** | Qué hacer (flujo de trabajo, estándares de calidad) | Markdown |
| **Agents** | Quién sabe qué (conocimiento especializado) | JSON |
| **Adapters** | Cómo integrar (configuración específica de herramienta) | Markdown |

Esta separación permite:

- Las reglas evolucionan independientemente del soporte de herramientas
- Añadir nuevos agentes sin cambiar las reglas principales
- Soportar nuevas herramientas sin modificar las reglas existentes

### Extensibilidad sobre complejidad

El sistema está diseñado para ser extendido, no configurado:

- Añade nuevos agentes especialistas creando archivos JSON
- Soporta nuevas herramientas escribiendo guías de adaptador
- Incluye contexto específico del proyecto sin modificar las reglas principales

Las cosas simples deben ser simples. Las cosas complejas deben ser posibles.

## Modelo de flujo de trabajo

Codingbuddy introduce un flujo de trabajo estructurado para el desarrollo asistido por IA:

```
PLAN → ACT → EVAL
```

### Modo PLAN (predeterminado)

- Entender los requisitos
- Diseñar el enfoque de implementación
- Identificar riesgos y casos límite
- Sin cambios de código

### Modo ACT

- Ejecutar el plan
- Seguir TDD: Red → Green → Refactor
- Cambios incrementales y probados

### Modo EVAL

- Revisar la calidad de la implementación
- Identificar mejoras
- Sugerir oportunidades de refactorización

Este flujo de trabajo previene la trampa común de que los asistentes de IA salten directamente al código sin una planificación adecuada.

## Lo que Codingbuddy no es

- **No es un generador de código**: Proporciona reglas y contexto, no código generado
- **No es un reemplazo del juicio humano**: Mejora, no reemplaza, la toma de decisiones del desarrollador
- **No es una solución única para todo**: Está diseñado para ser personalizado por proyecto

## Lecturas adicionales

- [Primeros pasos](./getting-started.md) - Guía de configuración rápida
- [Herramientas compatibles](./supported-tools.md) - Integración de herramientas de IA
- [Reglas principales](../../packages/rules/.ai-rules/rules/core.md) - Detalles del flujo de trabajo
- [Sistema de agentes](../../packages/rules/.ai-rules/agents/README.md) - Agentes especialistas
