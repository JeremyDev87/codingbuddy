'use strict';

const readline = require('node:readline');

/**
 * Ask a question via stdin and return the answer.
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
function ask(question, defaultValue) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? ` (${defaultValue})` : '';

  return new Promise(resolve => {
    rl.question(`${question}${suffix}: `, answer => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Ask user to select from a list of options.
 * @param {string} question
 * @param {string[]} options
 * @param {number} [defaultIndex=0]
 * @returns {Promise<string>}
 */
async function select(question, options, defaultIndex = 0) {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? '>' : ' ';
    console.log(`  ${marker} ${i + 1}. ${opt}`);
  });

  const answer = await ask('Select', String(defaultIndex + 1));
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < options.length) {
    return options[index];
  }
  return options[defaultIndex];
}

/**
 * Ask yes/no question.
 * @param {string} question
 * @param {boolean} [defaultValue=true]
 * @returns {Promise<boolean>}
 */
async function confirm(question, defaultValue = true) {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  const answer = await ask(`${question} (${hint})`, '');

  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

module.exports = { ask, select, confirm };
