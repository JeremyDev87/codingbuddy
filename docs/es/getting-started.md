<p align="center">
  <a href="../getting-started.md">English</a> |
  <a href="../ko/getting-started.md">한국어</a> |
  <a href="../zh-CN/getting-started.md">中文</a> |
  <a href="../ja/getting-started.md">日本語</a> |
  <a href="getting-started.md">Español</a>
</p>

# Primeros pasos

Pon en marcha Codingbuddy en minutos.

## Prerrequisitos

- **Node.js**: v18 o superior
- **Herramienta de IA**: Cualquier asistente de codificación IA compatible ([ver lista completa](./supported-tools.md))

## Inicio rápido

### Paso 1: Inicializar el proyecto

```bash
# Inicializa Codingbuddy en tu proyecto (no requiere clave API)
npx codingbuddy init
```

Este comando analiza tu proyecto y crea `codingbuddy.config.js` con:

- Stack tecnológico detectado (lenguajes, frameworks, herramientas)
- Patrones de arquitectura
- Convenciones de codificación
- Estrategia de pruebas

#### Inicialización con IA (Opcional)

Para un análisis más detallado usando IA, usa el flag `--ai`:

```bash
# Configura la clave API de Anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Ejecuta la inicialización con IA
npx codingbuddy init --ai
```

El modo con IA proporciona un análisis más profundo del proyecto y configuraciones más personalizadas.

### Paso 2: Configurar la herramienta de IA

Añade Codingbuddy a tu asistente de IA. Aquí tienes un ejemplo para Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

Consulta [Herramientas compatibles](./supported-tools.md) para otras herramientas de IA.

### Paso 3: Comenzar a codificar

Ahora tu asistente de IA puede acceder a:

- **Contexto del proyecto**: Stack tecnológico, arquitectura, convenciones
- **Modos de flujo de trabajo**: PLAN → ACT → EVAL
- **Agentes especialistas**: Expertos en seguridad, rendimiento, accesibilidad

Pruébalo:

```
Usuario: PLAN crear una función de autenticación de usuario

IA: # Mode: PLAN
    Diseñaré la función de autenticación basándome en los patrones del proyecto...
```

## Configuración

### Archivo de configuración generado

El archivo `codingbuddy.config.js` personaliza el comportamiento de la IA:

```javascript
module.exports = {
  // La IA responde en este idioma
  language: 'es',

  // Metadatos del proyecto
  projectName: 'my-app',

  // Stack tecnológico
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
  },

  // Patrones de arquitectura
  architecture: {
    pattern: 'feature-sliced-design',
  },

  // Convenciones de codificación
  conventions: {
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },

  // Estrategia de pruebas
  testStrategy: {
    approach: 'tdd',
    coverage: 80,
  },
};
```

Consulta [Esquema de configuración](../config-schema.md) para todas las opciones.

### Contexto adicional

Añade documentación específica del proyecto que la IA debería conocer:

```
my-project/
├── codingbuddy.config.js
└── .codingbuddy/
    └── context/
        ├── architecture.md    # Documentación de arquitectura del sistema
        └── api-conventions.md # Convenciones de diseño de API
```

### Patrones de exclusión

Crea `.codingignore` para excluir archivos del análisis de IA:

```gitignore
# Dependencias
node_modules/

# Salida de compilación
dist/
.next/

# Archivos sensibles
.env*
*.pem
```

## Uso de modos de flujo de trabajo

### Modo PLAN (predeterminado)

Planifica antes de hacer cambios:

```
Usuario: PLAN añadir soporte para modo oscuro

IA: # Mode: PLAN

    ## Plan de implementación
    1. Crear contexto de tema...
    2. Añadir componente de alternancia...
    3. Persistir preferencias...
```

### Modo ACT

Ejecuta el plan y realiza cambios de código:

```
Usuario: ACT

IA: # Mode: ACT

    Creando contexto de tema...
    [Cambios de código siguiendo TDD]
```

### Modo EVAL

Revisa y mejora la implementación:

```
Usuario: EVAL

IA: # Mode: EVAL

    ## Revisión de código
    - ✅ Contexto de tema correctamente tipado
    - ⚠️ Considerar añadir detección de preferencias del sistema
```

## Uso de agentes especialistas

Activa expertos de dominio para tareas específicas:

```
Usuario: Activar agente security-specialist para revisar autenticación

IA: [Activando security-specialist]

    ## Revisión de seguridad
    - Hash de contraseña: ✅ Usando bcrypt
    - Gestión de sesiones: ⚠️ Considerar expiración de token más corta
    ...
```

Especialistas disponibles:

- `security-specialist` - Auditorías de seguridad
- `performance-specialist` - Optimización de rendimiento
- `accessibility-specialist` - Conformidad WCAG
- `code-reviewer` - Calidad de código
- `architecture-specialist` - Arquitectura de sistemas
- `test-strategy-specialist` - Estrategia de pruebas
- `i18n-specialist` - Internacionalización
- `seo-specialist` - Optimización SEO
- `ui-ux-designer` - Diseño UI/UX
- `documentation-specialist` - Documentación
- `code-quality-specialist` - Estándares de calidad de código
- Ver [guía completa de agentes](../../packages/rules/.ai-rules/agents/README.md)

## Próximos pasos

- [Herramientas compatibles](./supported-tools.md) - Guías de configuración para cada herramienta de IA
- [Filosofía](./philosophy.md) - Entender los principios de diseño
- [Referencia API](../api.md) - Capacidades del servidor MCP
- [Desarrollo](../development.md) - Contribuir a Codingbuddy
