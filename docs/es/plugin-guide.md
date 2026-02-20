<p align="center">
  <a href="../plugin-guide.md">English</a> |
  <a href="../ko/plugin-guide.md">한국어</a> |
  <a href="../zh-CN/plugin-guide.md">中文</a> |
  <a href="../ja/plugin-guide.md">日本語</a> |
  <a href="plugin-guide.md">Español</a> |
  <a href="../pt-BR/plugin-guide.md">Português</a>
</p>

# Guía de Instalación y Configuración del Plugin de Claude Code

**Codingbuddy orquesta 35 agentes de IA** para ofrecer calidad de código a nivel de equipo de expertos humanos a través del flujo de trabajo PLAN → ACT → EVAL.

Esta guía proporciona instrucciones paso a paso para instalar y configurar el Plugin de CodingBuddy para Claude Code.

## Requisitos Previos

Antes de instalar el plugin, asegúrese de tener:

- **Node.js** 18.0 o superior
- **Claude Code** CLI instalado y autenticado
- Gestor de paquetes **npm** o **yarn**

Para verificar su entorno:

```bash
# Verificar versión de Node.js
node --version  # Debe ser v18.0.0 o superior

# Verificar que Claude Code está instalado
claude --version
```

## Métodos de Instalación

### Método 1: Mediante Claude Code Marketplace (Recomendado)

La forma más sencilla de instalar el plugin:

```bash
# 1. Agregar el marketplace
claude marketplace add JeremyDev87/codingbuddy

# 2. Instalar el plugin
claude plugin install codingbuddy@jeremydev87
```

> **Nota de Migración**: Si anteriormente usó `claude marketplace add https://jeremydev87.github.io/codingbuddy`, elimine el marketplace antiguo y use el formato de repositorio de GitHub mostrado arriba. El formato de URL está obsoleto.

Esto automáticamente:
- Descarga la última versión del plugin
- Lo registra con Claude Code
- Configura la configuración MCP

### Método 2: Mediante npm

Para mayor control sobre la instalación:

```bash
# Instalación global
npm install -g codingbuddy-claude-plugin

# O con yarn
yarn global add codingbuddy-claude-plugin
```

## Configuración del Servidor MCP (Requerido)

El plugin requiere el servidor MCP de CodingBuddy para su funcionalidad completa. El servidor MCP proporciona:

- Agentes especialistas y habilidades
- Modos de flujo de trabajo (PLAN/ACT/EVAL/AUTO)
- Listas de verificación contextuales
- Gestión de sesiones

### Instalar el Servidor MCP

```bash
npm install -g codingbuddy
```

### Configurar Claude Code

Agregue el servidor MCP a su configuración de Claude Code:

**Opción A: Configuración Global**

Edite `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

**Opción B: Configuración a Nivel de Proyecto**

Cree `.mcp.json` en la raíz de su proyecto:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

## Verificar la Instalación

### Paso 1: Comprobar que el Plugin está Registrado

```bash
claude plugin list
```

Debería ver `codingbuddy` en la lista.

### Paso 2: Probar la Conexión MCP

Inicie Claude Code e intente un comando de flujo de trabajo:

```bash
claude

# En Claude Code, escriba:
PLAN implement a user login feature
```

Si está configurado correctamente, verá:
- Indicador de modo: `# Mode: PLAN`
- Mensaje de activación del agente
- Salida de plan estructurado

### Paso 3: Verificar las Herramientas MCP

En Claude Code, compruebe las herramientas disponibles:

```
/mcp
```

Debería ver herramientas de CodingBuddy como:
- `parse_mode`
- `get_agent_details`
- `generate_checklist`
- `read_context`
- `update_context`

## Resolución de Problemas de Instalación

### El Plugin No Aparece

**Síntoma**: `claude plugin list` no muestra codingbuddy

**Soluciones**:
1. Reinstale el plugin:
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

2. Verifique la versión de Claude Code:
   ```bash
   claude --version
   # Actualice si es necesario
   npm update -g @anthropic-ai/claude-code
   ```

### El Servidor MCP No Conecta

**Síntoma**: Los comandos de flujo de trabajo no funcionan, no hay activación del agente

**Soluciones**:
1. Verifique que codingbuddy está instalado globalmente:
   ```bash
   which codingbuddy  # Debe mostrar la ruta
   codingbuddy --version
   ```

2. Compruebe la configuración MCP:
   ```bash
   cat ~/.claude/settings.json
   # Verifique que existe la sección mcpServers
   ```

3. Reinicie Claude Code:
   ```bash
   # Salga y reinicie
   claude
   ```

### Errores de Permisos

**Síntoma**: La instalación falla con EACCES o permiso denegado

**Soluciones**:
1. Corrija los permisos de npm:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. O use un gestor de versiones de Node (nvm, fnm)

### Incompatibilidad de Versiones

**Síntoma**: Las funciones no funcionan como se espera

**Soluciones**:
1. Actualice ambos paquetes:
   ```bash
   npm update -g codingbuddy codingbuddy-claude-plugin
   ```

2. Verifique que las versiones coinciden:
   ```bash
   codingbuddy --version
   # La versión del plugin se muestra al inicio en Claude Code
   ```

## Opciones de Configuración

### Configuración a Nivel de Proyecto

Cree `codingbuddy.config.json` en la raíz de su proyecto:

```javascript
module.exports = {
  // Idioma para las respuestas (auto-detectado por defecto)
  language: 'es',  // 'en', 'ko', 'ja', 'zh', 'es'

  // Modo de flujo de trabajo por defecto
  defaultMode: 'PLAN',

  // Agentes especialistas habilitados
  specialists: [
    'security-specialist',
    'accessibility-specialist',
    'performance-specialist'
  ]
};
```

### Variables de Entorno

| Variable | Descripción | Por Defecto |
|----------|-------------|-------------|
| `CODINGBUDDY_LANGUAGE` | Idioma de respuesta | auto-detectar |
| `CODINGBUDDY_DEBUG` | Habilitar registro de depuración | false |

## Próximos Pasos

Después de la instalación, explore:

- [Referencia Rápida](./plugin-quick-reference.md) - Comandos y flujos de trabajo de un vistazo
- [Arquitectura del Plugin](./plugin-architecture.md) - Cómo funciona el plugin
- [Ejemplos de Uso](./plugin-examples.md) - Ejemplos de flujos de trabajo del mundo real
- [Preguntas Frecuentes](./plugin-faq.md) - Respuestas a preguntas comunes

## Actualizar el Plugin

### Actualizar mediante Claude Code

```bash
claude plugin update codingbuddy
```

### Actualizar mediante npm

```bash
npm update -g codingbuddy codingbuddy-claude-plugin
```

## Desinstalar

### Eliminar el Plugin

```bash
claude plugin remove codingbuddy
```

### Eliminar el Servidor MCP

```bash
npm uninstall -g codingbuddy
```

### Limpiar la Configuración

Elimine la entrada `codingbuddy` de:
- `~/.claude/settings.json` (global)
- `.mcp.json` (nivel de proyecto)

---

<sub>🤖 Este documento fue traducido con asistencia de IA. Si encuentras errores o sugerencias de mejora, por favor repórtalos en [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues).</sub>
