#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const RULES_DIR = path.resolve(__dirname, '..', '.ai-rules');

function showHelp() {
  console.log(`
codingbuddy - AI coding rules CLI

Usage:
  codingbuddy <command> [options]

Commands:
  init          Initialize .ai-rules in the current project
  validate      Validate .ai-rules structure (agents JSON, rules markdown)
  list-agents   List available specialist agents

Options:
  --help, -h    Show this help message
  --version, -v Show version
`.trim());
}

function showVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
  );
  console.log(pkg.version);
}

function listAgents() {
  const agentsDir = path.join(RULES_DIR, 'agents');
  if (!fs.existsSync(agentsDir)) {
    console.error('Error: agents directory not found at', agentsDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  console.log(`Available agents (${files.length}):\n`);
  for (const file of files) {
    try {
      const agent = JSON.parse(
        fs.readFileSync(path.join(agentsDir, file), 'utf8'),
      );
      const name = agent.name || path.basename(file, '.json');
      const desc = agent.description || '';
      console.log(`  ${name.padEnd(30)} ${desc}`);
    } catch {
      console.log(`  ${path.basename(file, '.json').padEnd(30)} (parse error)`);
    }
  }
}

function validate() {
  let errors = 0;

  // Check .ai-rules directory exists
  if (!fs.existsSync(RULES_DIR)) {
    console.error('Error: .ai-rules directory not found at', RULES_DIR);
    process.exit(1);
  }

  // Validate agents JSON
  const agentsDir = path.join(RULES_DIR, 'agents');
  if (fs.existsSync(agentsDir)) {
    const jsonFiles = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.json'));
    for (const file of jsonFiles) {
      try {
        JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf8'));
      } catch (e) {
        console.error(`FAIL  agents/${file}: invalid JSON - ${e.message}`);
        errors++;
      }
    }
    console.log(`OK    agents/ - ${jsonFiles.length} JSON files valid`);
  }

  // Validate rules markdown files exist
  const rulesDir = path.join(RULES_DIR, 'rules');
  if (fs.existsSync(rulesDir)) {
    const mdFiles = fs
      .readdirSync(rulesDir)
      .filter((f) => f.endsWith('.md'));
    if (mdFiles.length === 0) {
      console.error('FAIL  rules/ - no markdown files found');
      errors++;
    } else {
      console.log(`OK    rules/ - ${mdFiles.length} markdown files found`);
    }
  } else {
    console.error('FAIL  rules/ directory missing');
    errors++;
  }

  // Validate schemas directory
  const schemasDir = path.join(RULES_DIR, 'schemas');
  if (fs.existsSync(schemasDir)) {
    const schemaFiles = fs
      .readdirSync(schemasDir)
      .filter((f) => f.endsWith('.json'));
    for (const file of schemaFiles) {
      try {
        JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8'));
      } catch (e) {
        console.error(`FAIL  schemas/${file}: invalid JSON - ${e.message}`);
        errors++;
      }
    }
    console.log(`OK    schemas/ - ${schemaFiles.length} JSON files valid`);
  }

  // Validate keyword-modes.json
  const keywordModes = path.join(RULES_DIR, 'keyword-modes.json');
  if (fs.existsSync(keywordModes)) {
    try {
      JSON.parse(fs.readFileSync(keywordModes, 'utf8'));
      console.log('OK    keyword-modes.json valid');
    } catch (e) {
      console.error(`FAIL  keyword-modes.json: invalid JSON - ${e.message}`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\nValidation failed with ${errors} error(s)`);
    process.exit(1);
  }
  console.log('\nAll validations passed');
}

function init() {
  const { run } = require('../lib/init');
  run().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  showVersion();
  process.exit(0);
}

switch (command) {
  case 'init':
    init();
    break;
  case 'validate':
    validate();
    break;
  case 'list-agents':
    listAgents();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}
