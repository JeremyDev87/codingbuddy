'use strict';

const path = require('node:path');
const { detectStack } = require('./detect-stack');
const { suggestAgent } = require('./suggest-agent');
const { generateConfig } = require('./generate-config');
const { scaffold } = require('./scaffold');
const { ask, select, confirm } = require('./prompt');

const LANGUAGES = ['en', 'ko', 'ja', 'zh', 'es'];

/**
 * Run the codingbuddy init wizard.
 * @param {string} [cwd=process.cwd()]
 */
async function run(cwd) {
  const targetDir = cwd || process.cwd();

  console.log('\n  codingbuddy init\n');
  console.log('  Initializing codingbuddy for your project...\n');

  // Step 1: Detect tech stack
  console.log('  Detecting tech stack...');
  const stack = detectStack(targetDir);

  if (stack.runtime !== 'unknown') {
    console.log(`  Detected: ${stack.runtime} (${stack.language})`);
    if (stack.frameworks.length > 0) {
      console.log(`  Frameworks: ${stack.frameworks.join(', ')}`);
    }
    console.log(`  Category: ${stack.category}`);
  } else {
    console.log('  No recognized project files found.');
  }

  // Step 2: Language selection
  const language = await select('Select communication language:', LANGUAGES, 0);
  console.log(`  Language: ${language}`);

  // Step 3: Agent suggestion
  const suggested = suggestAgent(stack);
  console.log(`\n  Recommended primary agent: ${suggested}`);
  const useAgent = await confirm(`  Use ${suggested} as primary agent?`, true);

  let primaryAgent = suggested;
  if (!useAgent) {
    primaryAgent = await ask('  Enter agent name', 'software-engineer');
  }

  // Step 4: Generate config
  console.log('\n  Creating codingbuddy.config.json...');
  const configResult = generateConfig(targetDir, {
    language,
    primaryAgent,
    techStack: stack,
  });

  if (configResult.skipped) {
    console.log('  codingbuddy.config.json already exists, skipped.');
  } else {
    console.log('  Created codingbuddy.config.json');
  }

  // Step 5: Scaffold .ai-rules
  const doScaffold = await confirm('  Scaffold .ai-rules/ directory with default rules?', true);

  if (doScaffold) {
    console.log('  Scaffolding .ai-rules/...');
    const scaffoldResult = scaffold(targetDir);

    if (scaffoldResult.skipped) {
      console.log('  .ai-rules/ already exists, skipped.');
    } else {
      console.log(`  Created .ai-rules/ with: ${scaffoldResult.dirs.join(', ')}`);
    }
  }

  // Done
  console.log('\n  Done! codingbuddy is ready.\n');
  console.log('  Next steps:');
  console.log('    1. Review codingbuddy.config.json');
  console.log('    2. Customize .ai-rules/ for your project');
  console.log('    3. Start coding with your AI assistant\n');
}

module.exports = { run };
