/**
 * React Template
 */

import type { ConfigTemplate } from '../template.types';

export const reactTemplate: ConfigTemplate = {
  metadata: {
    id: 'react',
    name: 'React',
    description: 'React frontend application (Vite, CRA, etc.)',
    matchPatterns: ['react', 'react-dom'],
  },
  config: {
    language: 'ko',
    techStack: {
      languages: ['TypeScript'],
      frontend: ['React'],
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
// React Project Configuration File
//
// This file is used by AI coding assistants to understand project context.
// Modify the values to match your project.
// ============================================================`,
    language: `// 🌍 Language Setting
  // Specify the language for AI responses. ('ko', 'en', 'ja', etc.)`,
    projectInfo: `// 📦 Project Information`,
    techStack: `// 🛠️ Tech Stack
  // Auto-detected values. Add state management, styling libraries, etc.
  // Example: frontend: ['React', 'Redux', 'Tailwind CSS']`,
    architecture: `// 🏗️ Architecture
  // pattern: 'feature-based' | 'atomic' | 'layered'
  // componentStyle: 'flat' | 'grouped' | 'feature-based'`,
    conventions: `// 📝 Coding Conventions`,
    testStrategy: `// 🧪 Test Strategy
  // Recommended to use with React Testing Library.`,
    footer: `// ============================================================
  // 💡 TIP: Sync with MCP
  //
  // codingbuddy MCP analyzes your project and suggests config updates.
  // ============================================================`,
  },
};
