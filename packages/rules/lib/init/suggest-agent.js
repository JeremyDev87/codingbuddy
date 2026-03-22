'use strict';

const AGENT_MAP = {
  mobile: 'mobile-developer',
  frontend: 'frontend-developer',
  fullstack: 'software-engineer',
};

const RUNTIME_AGENTS = {
  rust: 'systems-developer',
  go: 'backend-developer',
  python: 'backend-developer',
};

const DATA_SCIENCE_FRAMEWORKS = ['pandas', 'numpy', 'scipy', 'jupyter', 'tensorflow', 'pytorch', 'scikit-learn'];

/**
 * Suggest the best primary agent based on detected tech stack.
 * @param {{ runtime: string, category: string, frameworks: string[] }} stack
 * @returns {string} Agent name (e.g. 'frontend-developer')
 */
function suggestAgent(stack) {
  // Data science detection for Python
  if (stack.runtime === 'python' && stack.frameworks.some(f => DATA_SCIENCE_FRAMEWORKS.includes(f))) {
    return 'data-scientist';
  }

  // Category-based mapping
  if (AGENT_MAP[stack.category]) {
    return AGENT_MAP[stack.category];
  }

  // Runtime-based mapping
  if (RUNTIME_AGENTS[stack.runtime]) {
    return RUNTIME_AGENTS[stack.runtime];
  }

  // Backend Node.js
  if (stack.runtime === 'node' && stack.category === 'backend') {
    return 'backend-developer';
  }

  return 'software-engineer';
}

module.exports = { suggestAgent };
