#!/usr/bin/env ts-node
/**
 * Build Script for Claude Code Plugin
 *
 * Orchestrates the plugin build process:
 * 1. Sync version from MCP server
 * 2. Generate README
 *
 * Note: Agents, commands, and skills are NOT generated here.
 * They live in packages/rules/.ai-rules/ (single source of truth).
 * The MCP server provides them via the MCP protocol.
 *
 * Usage:
 *   ts-node scripts/build.ts
 */

import * as path from 'path';
import * as fs from 'fs';

// Import utilities
import { getErrorMessage } from '../src/utils';

// Paths
const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_SERVER_DIR = path.resolve(__dirname, '../../..', 'apps/mcp-server');

interface BuildResult {
  step: string;
  success: boolean;
  details: string[];
  errors: string[];
}

function syncVersion(): BuildResult {
  const result: BuildResult = {
    step: 'Version Sync',
    success: true,
    details: [],
    errors: [],
  };

  try {
    const mcpPkgPath = path.join(MCP_SERVER_DIR, 'package.json');
    const pluginPkgPath = path.join(ROOT_DIR, 'package.json');
    const manifestPath = path.join(ROOT_DIR, '.claude-plugin', 'plugin.json');

    if (!fs.existsSync(mcpPkgPath)) {
      result.errors.push('MCP server package.json not found');
      result.success = false;
      return result;
    }

    const mcpPkg = JSON.parse(fs.readFileSync(mcpPkgPath, 'utf8'));
    const version = mcpPkg.version;

    // Update plugin package.json
    const pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
    let pkgChanged = false;

    if (pluginPkg.version !== version) {
      pluginPkg.version = version;
      pkgChanged = true;
      result.details.push(`package.json version updated to ${version}`);
    }

    // Always check peerDependencies (even if version already matches)
    const [major, minor] = version.split('.');
    const expectedPeer = `^${major}.${minor}.0`;
    pluginPkg.peerDependencies = pluginPkg.peerDependencies || {};
    if (pluginPkg.peerDependencies.codingbuddy !== expectedPeer) {
      pluginPkg.peerDependencies.codingbuddy = expectedPeer;
      pkgChanged = true;
      result.details.push(
        `peerDependencies.codingbuddy updated to ${expectedPeer}`,
      );
    }

    if (pkgChanged) {
      fs.writeFileSync(
        pluginPkgPath,
        JSON.stringify(pluginPkg, null, 2) + '\n',
      );
    } else {
      result.details.push(`package.json already at ${version}`);
    }

    // Update manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.version !== version) {
      manifest.version = version;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      result.details.push(`plugin.json updated to ${version}`);
    } else {
      result.details.push(`plugin.json already at ${version}`);
    }
  } catch (error) {
    result.success = false;
    result.errors.push(getErrorMessage(error));
  }

  return result;
}

function createReadme(): BuildResult {
  const result: BuildResult = {
    step: 'README Generation',
    success: true,
    details: [],
    errors: [],
  };

  try {
    // Read version from package.json for dynamic README
    const pluginPkgPath = path.join(ROOT_DIR, 'package.json');
    const pluginPkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf8'));
    const version = pluginPkg.version;

    const readmeContent = `# CodingBuddy Claude Code Plugin

> Version ${version}

Multi-AI Rules for consistent coding practices - PLAN/ACT/EVAL workflow, specialist agents, and reusable skills for systematic development.

## Installation

\`\`\`bash
# Via npm
npm install codingbuddy-claude-plugin

# Or via Claude Code
claude plugin add codingbuddy
\`\`\`

## Features

### Workflow Modes
- **PLAN**: Design implementation approach with TDD
- **ACT**: Execute changes following quality standards
- **EVAL**: Evaluate code quality and suggest improvements
- **AUTO**: Autonomous PLAN → ACT → EVAL cycle

### Commands
- \`/plan\` - Enter PLAN mode
- \`/act\` - Enter ACT mode
- \`/eval\` - Enter EVAL mode
- \`/auto\` - Enter AUTO mode
- \`/checklist\` - Generate contextual checklists

### Specialist Agents
29 specialist agents for different domains:
- Security, Performance, Accessibility
- Architecture, Testing, Code Quality
- Frontend, Backend, DevOps
- And more...

### Skills
Reusable workflows for consistent development:
- Test-Driven Development
- Systematic Debugging
- API Design
- Refactoring
- And more...

## MCP Integration (Required)

This plugin requires the CodingBuddy MCP server for full functionality:

\`\`\`bash
npm install -g codingbuddy
\`\`\`

The MCP server provides:
- Agents, commands, and skills from \`packages/rules/.ai-rules/\` (single source of truth)
- Checklists and specialist agent recommendations
- Context management for PLAN/ACT/EVAL workflow

## Architecture

\`\`\`
packages/rules/.ai-rules/     ← Single source of truth (agents, skills, rules)
        ↓ (MCP protocol)
packages/claude-code-plugin/  ← Thin plugin (manifest + MCP configuration)
\`\`\`

This architecture ensures:
- **No duplication**: All definitions live in one place
- **DRY principle**: Changes only need to be made once
- **Single source of truth**: \`packages/rules/.ai-rules/\` is the canonical source

## Documentation

- [Core Rules](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/rules)
- [Agents Guide](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/agents)
- [Skills Guide](https://github.com/JeremyDev87/codingbuddy/tree/master/packages/rules/.ai-rules/skills)

## License

MIT
`;

    fs.writeFileSync(path.join(ROOT_DIR, 'README.md'), readmeContent);
    result.details.push('README.md created');
  } catch (error) {
    result.success = false;
    result.errors.push(getErrorMessage(error));
  }

  return result;
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CodingBuddy Claude Code Plugin Builder             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: BuildResult[] = [];

  // Step 1: Version Sync
  console.log('📦 Step 1: Syncing version...');
  results.push(syncVersion());

  // Step 2: Generate README
  console.log('📖 Step 2: Generating README...');
  results.push(createReadme());

  // Summary
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('Build Summary');
  console.log('════════════════════════════════════════════════════════════\n');

  let allSuccess = true;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.step}`);

    for (const detail of result.details) {
      console.log(`   ${detail}`);
    }
    for (const error of result.errors) {
      console.log(`   ❗ ${error}`);
    }

    if (!result.success) {
      allSuccess = false;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  if (allSuccess) {
    console.log('✨ Build completed successfully!');
    console.log(`\nOutput directory: ${ROOT_DIR}`);
    console.log('  ├── .claude-plugin/  (plugin manifest)');
    console.log('  ├── .mcp.json        (MCP server configuration)');
    console.log('  └── README.md        (plugin documentation)');
    console.log(
      '\nNote: Agents, commands, and skills are provided by MCP server',
    );
    console.log(
      '      from packages/rules/.ai-rules/ (single source of truth)',
    );
  } else {
    console.log('❌ Build completed with errors');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
