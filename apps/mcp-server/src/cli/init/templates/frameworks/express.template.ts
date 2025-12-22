/**
 * Express Template
 */

import type { ConfigTemplate } from '../template.types';

export const expressTemplate: ConfigTemplate = {
  metadata: {
    id: 'express',
    name: 'Express',
    description: 'Express.js backend API server',
    matchPatterns: ['express', 'fastify', 'koa'],
  },
  config: {
    language: 'ko',
    techStack: {
      languages: ['TypeScript'],
      backend: ['Express'],
    },
    architecture: {
      pattern: 'layered',
      structure: ['routes', 'controllers', 'services', 'models'],
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
// Express Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting`,
    projectInfo: `// 📦 Project Information`,
    techStack: `// 🛠️ Tech Stack
  // Add middleware and databases.
  // Example: backend: ['Express', 'Passport'], database: ['MongoDB']`,
    architecture: `// 🏗️ Architecture
  // Express recommends routes → controllers → services → models pattern.`,
    conventions: `// 📝 Coding Conventions`,
    testStrategy: `// 🧪 Test Strategy
  // Recommended to use supertest for API testing.`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // ============================================================`,
  },
};
