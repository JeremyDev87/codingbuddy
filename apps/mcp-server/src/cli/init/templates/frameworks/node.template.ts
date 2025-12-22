/**
 * Node.js Template
 */

import type { ConfigTemplate } from '../template.types';

export const nodeTemplate: ConfigTemplate = {
  metadata: {
    id: 'node',
    name: 'Node.js',
    description: 'Generic Node.js project (CLI tools, libraries, etc.)',
    matchPatterns: ['node', 'nodejs'],
  },
  config: {
    language: 'ko',
    techStack: {
      languages: ['TypeScript'],
    },
    architecture: {
      pattern: 'modular',
    },
    conventions: {
      naming: {
        files: 'kebab-case',
        functions: 'camelCase',
      },
    },
    testStrategy: {
      approach: 'tdd',
      coverage: 90,
      mockingStrategy: 'minimal',
    },
  },
  comments: {
    header: `// ============================================================
// CodingBuddy Configuration
// Node.js Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting`,
    projectInfo: `// 📦 Project Information`,
    techStack: `// 🛠️ Tech Stack
  // Add libraries you use.
  // Example: tools: ['Commander', 'Chalk']`,
    architecture: `// 🏗️ Architecture
  // pattern: 'modular' | 'layered' | 'plugin-based'`,
    conventions: `// 📝 Coding Conventions`,
    testStrategy: `// 🧪 Test Strategy`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // ============================================================`,
  },
};
