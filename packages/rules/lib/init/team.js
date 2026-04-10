'use strict';

const { detectTools } = require('./detect-tools');
const { generateAdapterConfigs } = require('./generate-adapter');

/**
 * Run the team bootstrap flow: detect AI tools + generate adapter configs.
 * @param {string} [cwd=process.cwd()]
 * @param {{ dryRun?: boolean, force?: boolean }} [options]
 * @returns {Promise<{ detected: number, generated: number, backedUp: number, skipped: number }>}
 */
async function runTeam(cwd, options) {
  const targetDir = cwd || process.cwd();
  const { dryRun = false, force = false } = options || {};

  console.log('\n  codingbuddy init --team\n');

  // Step 1: Detect AI tools
  console.log('  Scanning for AI coding tools...');
  const tools = detectTools(targetDir);
  const detected = tools.filter(t => t.exists);
  const notDetected = tools.filter(t => !t.exists);

  if (detected.length > 0) {
    console.log(`  Found ${detected.length} tool(s):`);
    for (const tool of detected) {
      const status = tool.hasConfig
        ? '\u26a0 has existing config \u2014 will overwrite (backup auto-created)'
        : '(no config)';
      console.log(`    \u2713 ${tool.name} ${status}`);
    }
  }

  if (notDetected.length > 0) {
    console.log(`  Not found: ${notDetected.map(t => t.name).join(', ')}`);
  }

  // Step 2: Generate adapter configs
  if (detected.length === 0) {
    console.log('\n  No AI tools detected. Nothing to configure.\n');
    return { detected: 0, generated: 0, backedUp: 0, skipped: 0 };
  }

  if (dryRun) {
    console.log('\n  Dry run \u2014 previewing changes:');
  } else {
    console.log('\n  Generating adapter configs...');
  }

  const result = generateAdapterConfigs(targetDir, detected, { dryRun, force });

  for (const item of result.generated) {
    const verb = dryRun ? 'would create' : 'created';
    console.log(`    ${verb}: ${item.path}`);
  }

  for (const item of result.backedUp) {
    console.log(`    backed up: ${item.from}`);
  }

  for (const item of result.skipped) {
    console.log(`    skipped: ${item.tool} (${item.reason})`);
  }

  const verb = dryRun ? 'would be generated' : 'generated';
  console.log(`\n  Done! ${result.generated.length} config(s) ${verb}.\n`);

  return {
    detected: detected.length,
    generated: result.generated.length,
    backedUp: result.backedUp.length,
    skipped: result.skipped.length,
  };
}

module.exports = { runTeam };
