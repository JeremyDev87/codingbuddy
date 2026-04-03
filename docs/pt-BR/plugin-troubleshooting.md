<p align="center">
  <a href="../plugin-troubleshooting.md">English</a> |
  <a href="../ko/plugin-troubleshooting.md">한국어</a> |
  <a href="../zh-CN/plugin-troubleshooting.md">中文</a> |
  <a href="../ja/plugin-troubleshooting.md">日本語</a> |
  <a href="../es/plugin-troubleshooting.md">Español</a> |
  <a href="plugin-troubleshooting.md">Português</a>
</p>

# Guia de Solução de Problemas do CodingBuddy

Soluções para problemas comuns ao usar o Plugin CodingBuddy para Claude Code.

## Problemas de Instalação

### Plugin Não Aparece no Claude Code

**Sintoma**: Após instalação, `claude plugin list` não mostra codingbuddy.

**Soluções**:

1. **Verificar se a instalação foi concluida**
   ```bash
   # Verificar se os arquivos do plugin existem
   ls ~/.claude/plugins/codingbuddy/
   ```

2. **Reinstalar o plugin**
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

3. **Verificar versão do Claude Code**
   ```bash
   claude --version
   # Sistema de plugins requer Claude Code 1.0+
   ```

4. **Reiniciar o Claude Code**
   ```bash
   # Sair completamente do Claude Code e reiniciar
   claude
   ```

### Instalação npm Falha

**Sintoma**: `npm install -g codingbuddy-claude-plugin` falha com erros.

**Soluções**:

1. **Erros de permissão (EACCES)**
   ```bash
   # Opção A: Usar um gerênciador de versoes do Node
   # Instalar nvm, depois:
   nvm install --lts
   npm install -g codingbuddy-claude-plugin

   # Opção B: Corrigir prefixo npm
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g codingbuddy-claude-plugin
   ```

2. **Erros de rede**
   ```bash
   # Verificar registro npm
   npm config get registry
   # Deve ser https://registry.npmjs.org/

   # Tentar com logging verbose
   npm install -g codingbuddy-claude-plugin --verbose
   ```

3. **Versão do Node muito antiga**
   ```bash
   node --version
   # Requer Node.js 18+
   # Atualizar Node.js se necessário
   ```

---

## Problemas do Marketplace

### Erro "Invalid marketplace schema"

**Sintoma**: `claude marketplace add` falha com:
```
✘ Failed to add marketplace: Invalid marketplace schema from URL: : Invalid input: expected object, received string
```

**Causa**: Usando formato de URL em vez do formato de repositório do GitHub.

**Solução**:
```bash
# Incorreto (formato URL - descontinuado)
claude marketplace add https://jeremydev87.github.io/codingbuddy

# Correto (formato de repositório GitHub)
claude marketplace add JeremyDev87/codingbuddy
```

### Migrando do Formato URL

Se você adicionou anteriormente o marketplace usando o formato URL:

```bash
# 1. Remover marketplace antigo
claude marketplace remove https://jeremydev87.github.io/codingbuddy

# 2. Adicionar com formato correto
claude marketplace add JeremyDev87/codingbuddy

# 3. Reinstalar o plugin
claude plugin install codingbuddy@jeremydev87
```

### Marketplace Não Encontrado

**Sintoma**: `claude marketplace add JeremyDev87/codingbuddy` falha com "not found"

**Soluções**:

1. **Verificar ortografia e maiúsculas/minúsculas**
   - Nome de usuário GitHub: `JeremyDev87` (diferencia maiúsculas)
   - Repositório: `codingbuddy`

2. **Verificar conectividade de rede**
   ```bash
   curl -I https://github.com/JeremyDev87/codingbuddy
   ```

3. **Atualizar Claude Code**
   ```bash
   npm update -g @anthropic-ai/claude-code
   ```

---

## Problemas de Conexão MCP

### Servidor MCP Não Conecta

**Sintoma**: Comandos de fluxo de trabalho (PLAN, ACT, EVAL) não ativam corretamente, nenhum agente mostrado.

**Diagnostico**:
```bash
# Verificar se o CLI codingbuddy está instalado
which codingbuddy
codingbuddy --version

# Verificar configuração MCP
cat ~/.claude/settings.json | grep -A5 codingbuddy
```

**Soluções**:

1. **Instalar o servidor MCP**
   ```bash
   npm install -g codingbuddy
   ```

2. **Adicionar configuração MCP**

   Editar `~/.claude/settings.json`:
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

3. **Reiniciar o Claude Code**
   ```bash
   # Sair e reiniciar
   claude
   ```

### Ferramentas MCP Não Disponiveis

**Sintoma**: Comando `/mcp` não mostra ferramentas do CodingBuddy.

**Soluções**:

1. **Verificar se o servidor MCP esta rodando**
   ```bash
   # Em um terminal separado, executar:
   codingbuddy
   # Deve iniciar sem erros
   ```

2. **Verificar se o PATH inclui codingbuddy**
   ```bash
   echo $PATH
   which codingbuddy
   # Se não encontrado, adicionar ao PATH
   ```

3. **Verificar servidores MCP conflitantes**
   ```bash
   cat ~/.claude/settings.json
   # Garantir que não ha entradas duplicadas para codingbuddy
   ```

### "Command not found: codingbuddy"

**Sintoma**: MCP tenta executar `codingbuddy` mas não e encontrado.

**Soluções**:

1. **Adicionar bin global do npm ao PATH**
   ```bash
   # Para npm
   export PATH="$(npm config get prefix)/bin:$PATH"

   # Para yarn
   export PATH="$(yarn global bin):$PATH"
   ```

2. **Usar caminho absoluto na configuração MCP**
   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "/usr/local/bin/codingbuddy",
         "args": ["mcp"]
       }
     }
   }
   ```

---

## Problemas de Fluxo de Trabalho

### Palavras-chave PLAN/ACT/EVAL Não Reconhecidas

**Sintoma**: Digitar "PLAN implement X" não aciona o modo de fluxo de trabalho.

**Soluções**:

1. **Verificar se a palavra-chave esta no início da mensagem**
   ```
   # Correto
   PLAN implement user login

   # Errado - palavra-chave não no início
   Can you PLAN implement user login
   ```

2. **Usar maiusculas ou palavras-chave localizadas**
   ```
   PLAN ...
   계획 ...  (Coreano)
   計画 ...  (Japones)
   ```

3. **Verificar se o MCP esta conectado**
   - Digite `/mcp` para ver ferramentas disponiveis
   - Deve mostrar a ferramenta `parse_mode`

### Contexto Não Persiste

**Sintoma**: Modo ACT não lembra das decisões do PLAN.

**Soluções**:

1. **Verificar se o arquivo de contexto existe**
   ```bash
   cat docs/codingbuddy/context.md
   ```

2. **Garantir que o PLAN foi completado corretamente**
   - Modo PLAN cria o arquivo de contexto
   - Se interrompido, reiniciar com PLAN

3. **Verificar permissoes do arquivo**
   ```bash
   ls -la docs/codingbuddy/
   # Garantir permissoes de escrita
   ```

### Modo AUTO Não Para

**Sintoma**: Modo AUTO continua iterándo mesmo quando problemas estão corrigidos.

**Soluções**:

1. **Verificar limite de iteráções**
   - Padrão e 5 iteráções
   - AUTO para quando Critical=0 E High=0

2. **Revisar achados do EVAL**
   - Alguns problemas podem ser recorrentes
   - Abordar causa raiz, não sintomas

3. **Intervenção manual**
   - Digite qualquer mensagem para interromper AUTO
   - Revise achados, depois reinicie se necessário

---

## Problemas de Performance

### Tempos de Resposta Lentos

**Sintoma**: Claude demora muito para responder em modos de fluxo de trabalho.

**Soluções**:

1. **Simplificar a tarefa**
   - Dividir tarefas complexas em partes menores
   - Usar PLAN para uma funcionalidade por vez

2. **Reduzir agentes especialistas**
   - Configurar menos especialistas em `codingbuddy.config.json`
   ```javascript
   module.exports = {
     specialists: ['security-specialist']  // Apenas essenciais
   };
   ```

3. **Verificar tamanho do contexto**
   - Arquivos de contexto grandes atrasam processamento
   - Iniciar PLAN novo para novas funcionalidades

### Uso Alto de Tokens

**Sintoma**: Atingindo limites de contexto rapidamente.

**Soluções**:

1. **Usar prompts focados**
   ```
   # Melhor
   PLAN add email validation to registration

   # Menos eficiente
   PLAN review the entire auth module and add validation
   ```

2. **Deixar o contexto compactar naturalmente**
   - Claude Code automaticamente resume contexto antigo
   - Não repetir manualmente contexto anterior

---

## Problemas de Configuração

### Configuração do Projeto Não Carrega

**Sintoma**: Configurações de `codingbuddy.config.json` não aplicadas.

**Soluções**:

1. **Verificar localização do arquivo**
   - Deve estar na raiz do projeto
   - Nomeado exatamente `codingbuddy.config.json`

2. **Verificar sintaxe**
   ```bash
   node -e "console.log(require('./codingbuddy.config.json'))"
   ```

3. **Verificar formato de export**
   ```javascript
   // Correto
   module.exports = { language: 'en' };

   // Errado
   export default { language: 'en' };
   ```

### Respostas em Idioma Errado

**Sintoma**: Claude responde no idioma errado.

**Soluções**:

1. **Definir idioma na configuração**
   ```javascript
   // codingbuddy.config.json
   module.exports = {
     language: 'ko'  // 'en', 'ko', 'ja', 'zh', 'es'
   };
   ```

2. **Usar variavel de ambiente**
   ```bash
   export CODINGBUDDY_LANGUAGE=ko
   ```

3. **Usar palavras-chave localizadas**
   - Comecar com Coreano: `계획 사용자 로그인 구현`
   - Claude respondera em Coreano

---

## Modo Debug

### Habilitar Logging Verbose

Para debug detalhado:

```bash
# Executar servidor MCP com saida de debug
CODINGBUDDY_DEBUG=true codingbuddy
```

### Verificar Comunicação MCP

```bash
# No Claude Code, verificar status MCP
/mcp

# Deve mostrar:
# - Status do servidor codingbuddy
# - Ferramentas disponiveis
# - Ultimo erro se houver
```

### Revisar Documento de Contexto

```bash
# Verificar qual contexto esta persistido
cat docs/codingbuddy/context.md

# Procurar por:
# - Decisoes anteriores do PLAN
# - Progressó do ACT
# - Achados do EVAL
```

---

## Obtendo Ajuda

### Reportar Problemas

1. **GitHub Issues**: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

2. **Incluir no relatório**:
   - Versão do Claude Code (`claude --version`)
   - Versão do plugin (do plugin.json)
   - Versão do servidor MCP (`codingbuddy --version`)
   - Passos para reproduzir
   - Mensagens de erro

### Verificar Documentação

- [Guia de Instalação](./plugin-guide.md)
- [Arquitetura](./plugin-architecture.md)
- [FAQ](./plugin-faq.md)

---

## Checklist de Diagnostico Rápido

```
[ ] Node.js 18+ instalado
[ ] Claude Code 1.0+ instalado
[ ] Plugin visivel em `claude plugin list`
[ ] Servidor MCP instalado (`which codingbuddy`)
[ ] Configuração MCP em settings.json
[ ] Pode ver ferramentas com `/mcp`
[ ] Palavra-chave PLAN aciona modo
[ ] Arquivo de contexto criado após PLAN
```

---

<sub>🤖 Este documento foi traduzido com assistência de IA. Se encontrar erros ou tiver sugestões de melhoria, por favor reporte em [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues).</sub>
