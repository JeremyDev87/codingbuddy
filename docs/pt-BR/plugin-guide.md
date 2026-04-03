<p align="center">
  <a href="../plugin-guide.md">English</a> |
  <a href="../ko/plugin-guide.md">한국어</a> |
  <a href="../zh-CN/plugin-guide.md">中文</a> |
  <a href="../ja/plugin-guide.md">日本語</a> |
  <a href="../es/plugin-guide.md">Español</a> |
  <a href="plugin-guide.md">Português</a>
</p>

# Guia de Instalação e Configuração do Plugin Claude Code

Este guia fornece instruções passo a passo para instalar e configurar o Plugin CodingBuddy para Claude Code.

## Pré-requisitos

Antes de instalar o plugin, certifique-se de que você possui:

- **Node.js** 18.0 ou superior
- **Claude Code** CLI instalado e autenticado
- Gerenciador de pacotes **npm** ou **yarn**

Para verificar seu ambiente:

```bash
# Verificar versão do Node.js
node --version  # Deve ser v18.0.0 ou superior

# Verificar se o Claude Code está instalado
claude --version
```

## Métodos de Instalação

### Método 1: Via Claude Code Marketplace (Recomendado)

A forma mais simples de instalar o plugin:

```bash
# 1. Adicionar o marketplace
claude marketplace add JeremyDev87/codingbuddy

# 2. Instalar o plugin
claude plugin install codingbuddy@jeremydev87
```

> **Nota de Migração**: Se você usou anteriormente `claude marketplace add https://jeremydev87.github.io/codingbuddy`, remova o marketplace antigo e use o formato de repositório do GitHub mostrado acima. O formato de URL está descontinuado.

Isso automaticamente:
- Baixa a versão mais recente do plugin
- Registra-o no Claude Code
- Configura o MCP

### Método 2: Via npm

Para maior controle sobre a instalação:

```bash
# Instalação global
npm install -g codingbuddy-claude-plugin

# Ou com yarn
yarn global add codingbuddy-claude-plugin
```

## Configuração do Servidor MCP (Obrigatório)

O plugin requer o servidor MCP do CodingBuddy para funcionalidade completa. O servidor MCP fornece:

- Agentes especialistas e habilidades
- Modos de fluxo de trabalho (PLAN/ACT/EVAL/AUTO)
- Checklists contextuais
- Gerenciamento de sessão

### Instalar o Servidor MCP

```bash
npm install -g codingbuddy
```

### Configurar o Claude Code

Adicione o servidor MCP à sua configuração do Claude Code:

**Opção A: Configuração Global**

Edite `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": ["mcp"]
    }
  }
}
```

**Opção B: Configuração em Nível de Projeto**

Crie `.mcp.json` na raiz do seu projeto:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": ["mcp"]
    }
  }
}
```

## Verificar a Instalação

### Passo 1: Verificar se o Plugin esta Registrado

```bash
claude plugin list
```

Você devera ver `codingbuddy` na lista.

### Passo 2: Testar a Conexão MCP

Inicie o Claude Code e tente um comando de fluxo de trabalho:

```bash
claude

# No Claude Code, digite:
PLAN implement a user login feature
```

Se configurado corretamente, você vera:
- Indicador de modo: `# Mode: PLAN`
- Mensagem de ativação do agente
- Saida do plano estruturado

### Passo 3: Verificar Ferramentas MCP

No Claude Code, verifique as ferramentas disponiveis:

```
/mcp
```

Você devera ver ferramentas do CodingBuddy como:
- `parse_mode`
- `get_agent_details`
- `generate_checklist`
- `read_context`
- `update_context`

## Solução de Problemas de Instalação

### Plugin Não Aparece

**Sintoma**: `claude plugin list` não mostra codingbuddy

**Soluções**:
1. Reinstalar o plugin:
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

2. Verificar a versão do Claude Code:
   ```bash
   claude --version
   # Atualizar se necessário
   npm update -g @anthropic-ai/claude-code
   ```

### Servidor MCP Não Conecta

**Sintoma**: Comandos de fluxo de trabalho não funcionam, sem ativação de agente

**Soluções**:
1. Verificar se o codingbuddy está instalado globalmente:
   ```bash
   which codingbuddy  # Deve mostrar o caminho
   codingbuddy --version
   ```

2. Verificar a configuração MCP:
   ```bash
   cat ~/.claude/settings.json
   # Verificar se a seção mcpServers existe
   ```

3. Reiniciar o Claude Code:
   ```bash
   # Sair e reiniciar
   claude
   ```

### Erros de Permissao

**Sintoma**: Instalação falha com EACCES ou permissão negada

**Soluções**:
1. Corrigir permissoes do npm:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. Ou usar um gerênciador de versoes do Node (nvm, fnm)

### Incompatibilidade de Versão

**Sintoma**: Recursos não funcionam como esperado

**Soluções**:
1. Atualizar ambos os pacotes:
   ```bash
   npm update -g codingbuddy codingbuddy-claude-plugin
   ```

2. Verificar se as versoes correspondem:
   ```bash
   codingbuddy --version
   # Versão do plugin mostrada na inicialização do Claude Code
   ```

## Opções de Configuração

### Configuração em Nível de Projeto

Crie `codingbuddy.config.json` na raiz do seu projeto:

```javascript
module.exports = {
  // Idioma para respostas (detectado automaticamente por padrão)
  language: 'en',  // 'en', 'ko', 'ja', 'zh', 'es'

  // Modo de fluxo de trabalho padrão
  defaultMode: 'PLAN',

  // Agentes especialistas habilitados
  specialists: [
    'security-specialist',
    'accessibility-specialist',
    'performance-specialist'
  ]
};
```

### Variaveis de Ambiente

| Variavel | Descrição | Padrão |
|----------|-----------|--------|
| `CODINGBUDDY_LANGUAGE` | Idioma das respostas | auto-detectar |
| `CODINGBUDDY_DEBUG` | Habilitar log de debug | false |

## Próximos Passos

Após a instalação, explore:

- [Referência Rapida](./plugin-quick-reference.md) - Comandos e fluxos de trabalho em um relance
- [Arquitetura do Plugin](./plugin-architecture.md) - Como o plugin funciona
- [Exemplos de Uso](./plugin-examples.md) - Exemplos de fluxos de trabalho reais
- [FAQ](./plugin-faq.md) - Perguntas comuns respondidas

## Atualizando o Plugin

### Atualizar via Claude Code

```bash
claude plugin update codingbuddy
```

### Atualizar via npm

```bash
npm update -g codingbuddy codingbuddy-claude-plugin
```

## Desinstalação

### Remover o Plugin

```bash
claude plugin remove codingbuddy
```

### Remover o Servidor MCP

```bash
npm uninstall -g codingbuddy
```

### Limpar Configuração

Remova a entrada `codingbuddy` de:
- `~/.claude/settings.json` (global)
- `.mcp.json` (nível de projeto)

---

<sub>🤖 Este documento foi traduzido com assistência de IA. Se encontrar erros ou tiver sugestões de melhoria, por favor reporte em [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues).</sub>
