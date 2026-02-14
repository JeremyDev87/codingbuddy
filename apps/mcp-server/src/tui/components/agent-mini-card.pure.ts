import {
  estimateDisplayWidth,
  truncateToDisplayWidth,
} from '../utils/display-width';

const ELLIPSIS = '\u2026';

const TAG_NAME_MAX = 20;
const TAG_SEPARATOR = ' \u00b7 ';

export function buildInlineAgentTag(name: string): string {
  if (estimateDisplayWidth(name) <= TAG_NAME_MAX) return name;
  return truncateToDisplayWidth(name, TAG_NAME_MAX - 1) + ELLIPSIS;
}

export function joinAgentTags(names: string[]): string {
  return names.map(buildInlineAgentTag).join(TAG_SEPARATOR);
}
