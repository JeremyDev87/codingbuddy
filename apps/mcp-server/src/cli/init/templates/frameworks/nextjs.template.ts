/**
 * Next.js Template
 */

import type { ConfigTemplate } from '../template.types';

export const nextjsTemplate: ConfigTemplate = {
  metadata: {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Next.js fullstack React framework with App Router',
    matchPatterns: ['next', 'nextjs'],
  },
  config: {
    language: 'ko',
    techStack: {
      languages: ['TypeScript'],
      frontend: ['React', 'Next.js'],
    },
    architecture: {
      pattern: 'feature-based',
      componentStyle: 'grouped',
    },
    conventions: {
      naming: {
        files: 'kebab-case',
        components: 'PascalCase',
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
// Next.js Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting
  // Specify the language for AI responses. ('ko', 'en', 'ja', etc.)`,
    projectInfo: `// 📦 Project Information
  // projectName and description are auto-detected. Modify if needed.`,
    techStack: `// 🛠️ Tech Stack
  // Auto-detected values. Add additional technologies to the arrays.
  // Example: backend: ['Prisma', 'tRPC'], database: ['PostgreSQL']`,
    architecture: `// 🏗️ Architecture
  // pattern: 'feature-based' | 'layered' | 'clean' | 'modular'
  // componentStyle: 'flat' | 'grouped' | 'feature-based'`,
    conventions: `// 📝 Coding Conventions
  // Define naming rules for your project.`,
    testStrategy: `// 🧪 Test Strategy
  // approach: 'tdd' (test first) | 'test-after' | 'mixed'
  // coverage: Target test coverage (%)
  // mockingStrategy: 'minimal' | 'no-mocks' | 'extensive'`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // When adding new dependencies, use 'suggest_config_updates' tool to check.
  //
  // 📚 Docs: https://github.com/JeremyDev87/codingbuddy
  // ============================================================`,
  },
};
