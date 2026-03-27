'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FRONTEND_FRAMEWORKS = ['react', 'vue', 'angular', 'svelte', 'solid-js'];
const FULLSTACK_FRAMEWORKS = ['next', 'nuxt', 'remix', 'sveltekit', 'astro'];
const BACKEND_FRAMEWORKS = [
  '@nestjs/core',
  'express',
  'fastify',
  'koa',
  'hapi',
  '@hono/node-server',
  'hono',
];
const MOBILE_FRAMEWORKS = ['react-native', 'expo', '@capacitor/core', 'ionic'];

/**
 * Detect tech stack from project files in the given directory.
 * @param {string} cwd - Directory to scan
 * @returns {{ runtime: string, language: string, frameworks: string[], category: string }}
 */
function detectStack(cwd) {
  const result = {
    runtime: 'unknown',
    language: 'javascript',
    frameworks: [],
    category: 'unknown',
  };

  if (tryDetectNode(cwd, result)) return result;
  if (tryDetectPython(cwd, result)) return result;
  if (tryDetectGo(cwd, result)) return result;
  if (tryDetectRust(cwd, result)) return result;

  result.language = 'unknown';
  return result;
}

function tryDetectNode(cwd, result) {
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return false;
  }

  result.runtime = 'node';

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Detect language
  if (allDeps.typescript) {
    result.language = 'typescript';
  }

  // Detect frameworks
  const detected = [];

  for (const fw of FULLSTACK_FRAMEWORKS) {
    if (allDeps[fw]) detected.push(fw);
  }
  for (const fw of FRONTEND_FRAMEWORKS) {
    if (allDeps[fw]) detected.push(fw);
  }
  for (const fw of BACKEND_FRAMEWORKS) {
    if (allDeps[fw]) {
      const name = fw.startsWith('@nestjs') ? 'nestjs' : fw;
      detected.push(name);
    }
  }
  for (const fw of MOBILE_FRAMEWORKS) {
    if (allDeps[fw]) detected.push(fw);
  }

  result.frameworks = detected;

  // Determine category
  if (detected.some(f => MOBILE_FRAMEWORKS.includes(f) || f === 'react-native' || f === 'expo')) {
    result.category = 'mobile';
  } else if (detected.some(f => FULLSTACK_FRAMEWORKS.includes(f))) {
    result.category = 'fullstack';
  } else if (detected.some(f => FRONTEND_FRAMEWORKS.includes(f))) {
    result.category = 'frontend';
  } else if (
    detected.some(f =>
      ['nestjs', ...BACKEND_FRAMEWORKS.map(b => (b.startsWith('@') ? 'nestjs' : b))].includes(f),
    )
  ) {
    result.category = 'backend';
  } else {
    result.category = 'backend'; // default for Node without frameworks
  }

  return true;
}

function tryDetectPython(cwd, result) {
  const pyprojectPath = path.join(cwd, 'pyproject.toml');
  if (!fs.existsSync(pyprojectPath)) return false;

  result.runtime = 'python';
  result.language = 'python';
  result.category = 'backend';

  const content = fs.readFileSync(pyprojectPath, 'utf-8');
  const pyFrameworks = {
    django: 'django',
    flask: 'flask',
    fastapi: 'fastapi',
    starlette: 'starlette',
  };

  for (const [key, name] of Object.entries(pyFrameworks)) {
    if (content.toLowerCase().includes(key)) {
      result.frameworks.push(name);
    }
  }

  return true;
}

function tryDetectGo(cwd, result) {
  const goModPath = path.join(cwd, 'go.mod');
  if (!fs.existsSync(goModPath)) return false;

  result.runtime = 'go';
  result.language = 'go';
  result.category = 'backend';

  const content = fs.readFileSync(goModPath, 'utf-8');
  if (content.includes('github.com/gin-gonic/gin')) result.frameworks.push('gin');
  if (content.includes('github.com/gofiber/fiber')) result.frameworks.push('fiber');
  if (content.includes('github.com/labstack/echo')) result.frameworks.push('echo');

  return true;
}

function tryDetectRust(cwd, result) {
  const cargoPath = path.join(cwd, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return false;

  result.runtime = 'rust';
  result.language = 'rust';
  result.category = 'backend';

  const content = fs.readFileSync(cargoPath, 'utf-8');
  if (content.includes('actix-web')) result.frameworks.push('actix-web');
  if (content.includes('axum')) result.frameworks.push('axum');
  if (content.includes('rocket')) result.frameworks.push('rocket');

  return true;
}

module.exports = { detectStack };
