/**
 * Default Template
 */

import type { ConfigTemplate } from '../template.types';

export const defaultTemplate: ConfigTemplate = {
  metadata: {
    id: 'default',
    name: 'Default',
    description: 'Generic project template',
    matchPatterns: [],
  },
  config: {
    language: 'ko',
    techStack: {},
    architecture: {},
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
// Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting
  // Specify the language for AI responses. ('ko', 'en', 'ja', etc.)`,
    projectInfo: `// 📦 Project Information
  // projectName: Project name
  // description: Project description`,
    techStack: `// 🛠️ Tech Stack
  // Define the technologies used in your project.
  //
  // techStack: {
  //   languages: ['TypeScript', 'Python'],
  //   frontend: ['React', 'Next.js'],
  //   backend: ['NestJS', 'FastAPI'],
  //   database: ['PostgreSQL', 'Redis'],
  //   infrastructure: ['Docker', 'AWS'],
  //   tools: ['GitHub Actions', 'Sentry'],
  // }`,
    architecture: `// 🏗️ Architecture
  // Define your project structure and patterns.
  //
  // architecture: {
  //   pattern: 'feature-based',  // 'layered', 'clean', 'modular'
  //   componentStyle: 'grouped', // 'flat', 'feature-based'
  //   structure: ['src', 'lib', 'tests'],
  // }`,
    conventions: `// 📝 Coding Conventions
  // Define naming rules and code style.`,
    testStrategy: `// 🧪 Test Strategy
  // approach: 'tdd' (test first) | 'test-after' (implement then test) | 'mixed'
  // coverage: Target test coverage (%)
  // mockingStrategy: 'minimal' | 'no-mocks' | 'extensive'`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // When your project changes, use 'suggest_config_updates' tool to check.
  //
  // 📚 Docs: https://github.com/JeremyDev87/codingbuddy
  // ============================================================`,
  },
};
