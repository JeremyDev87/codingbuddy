/**
 * NestJS Template
 */

import type { ConfigTemplate } from '../template.types';

export const nestjsTemplate: ConfigTemplate = {
  metadata: {
    id: 'nestjs',
    name: 'NestJS',
    description: 'NestJS backend framework with dependency injection',
    matchPatterns: ['@nestjs/core', 'nestjs'],
  },
  config: {
    language: 'ko',
    techStack: {
      languages: ['TypeScript'],
      backend: ['NestJS'],
    },
    architecture: {
      pattern: 'layered',
      structure: ['modules', 'controllers', 'services', 'repositories'],
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
// NestJS Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting`,
    projectInfo: `// 📦 Project Information`,
    techStack: `// 🛠️ Tech Stack
  // Add NestJS modules and databases.
  // Example: backend: ['NestJS', 'TypeORM'], database: ['PostgreSQL']`,
    architecture: `// 🏗️ Architecture
  // NestJS uses module-based layered architecture.
  // structure: Project layer structure`,
    conventions: `// 📝 Coding Conventions
  // Follows NestJS official style guide.`,
    testStrategy: `// 🧪 Test Strategy
  // Uses NestJS @nestjs/testing module.
  // e2e tests are located in the test/ directory.`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // ============================================================`,
  },
};
