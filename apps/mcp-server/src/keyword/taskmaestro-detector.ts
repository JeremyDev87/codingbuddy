import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Check if the TaskMaestro skill is installed at the expected path.
 * @returns true if ~/.claude/skills/taskmaestro/SKILL.md exists
 */
export function isTaskmaestroAvailable(): boolean {
  const skillPath = path.join(os.homedir(), '.claude', 'skills', 'taskmaestro', 'SKILL.md');
  try {
    return fs.existsSync(skillPath);
  } catch {
    return false;
  }
}
