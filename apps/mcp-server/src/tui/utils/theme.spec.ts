import { describe, it, expect } from 'vitest';
import {
  type CellStyle,
  NEON_COLORS,
  BORDER_COLORS,
  STATUS_STYLES,
  STATUS_ICONS,
  MODE_LABEL_STYLES,
  STAGE_LABEL_STYLES,
  EDGE_STYLES,
  SECTION_DIVIDER_STYLE,
  LEGEND_STYLE,
  PROGRESS_BAR_STYLES,
  GLOW_STYLE,
  PIPELINE_STYLES,
  PROGRESS_BAR_CHARS,
  GLOBAL_STATE_ICONS,
  GLOBAL_STATE_COLORS,
  getStatusStyle,
  getNodeStatusColor,
  getModeLabelStyle,
  getModeColor,
  getStageLabelStyle,
  AGENT_AVATARS,
  getAgentAvatar,
} from './theme';

describe('theme', () => {
  describe('NEON_COLORS', () => {
    it('defines all required color roles', () => {
      expect(NEON_COLORS.primary).toBe('cyan');
      expect(NEON_COLORS.secondary).toBe('magenta');
      expect(NEON_COLORS.running).toBe('green');
      expect(NEON_COLORS.warning).toBe('yellow');
      expect(NEON_COLORS.error).toBe('red');
      expect(NEON_COLORS.done).toBe('green');
      expect(NEON_COLORS.inactive).toBe('gray');
      expect(NEON_COLORS.content).toBe('white');
    });
  });

  describe('BORDER_COLORS', () => {
    it('defines panel border color as primary (cyan)', () => {
      expect(BORDER_COLORS.panel).toBe('cyan');
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(BORDER_COLORS)).toBe(true);
    });
  });

  describe('STATUS_STYLES', () => {
    it('maps running status to green bold', () => {
      expect(STATUS_STYLES.running).toEqual({ fg: 'green', bold: true });
    });

    it('maps idle status to gray dim', () => {
      expect(STATUS_STYLES.idle).toEqual({ fg: 'gray', dim: true });
    });

    it('maps blocked status to yellow', () => {
      expect(STATUS_STYLES.blocked).toEqual({ fg: 'yellow' });
    });

    it('maps error status to red bold', () => {
      expect(STATUS_STYLES.error).toEqual({ fg: 'red', bold: true });
    });

    it('maps done status to green', () => {
      expect(STATUS_STYLES.done).toEqual({ fg: 'green' });
    });
  });

  describe('MODE_LABEL_STYLES', () => {
    it('maps PLAN mode to cyan', () => {
      expect(MODE_LABEL_STYLES.PLAN).toEqual({ fg: 'cyan', bold: true });
    });

    it('maps ACT mode to magenta', () => {
      expect(MODE_LABEL_STYLES.ACT).toEqual({ fg: 'magenta', bold: true });
    });

    it('maps EVAL mode to yellow', () => {
      expect(MODE_LABEL_STYLES.EVAL).toEqual({ fg: 'yellow', bold: true });
    });

    it('maps AUTO mode to green', () => {
      expect(MODE_LABEL_STYLES.AUTO).toEqual({ fg: 'green', bold: true });
    });
  });

  describe('STAGE_LABEL_STYLES', () => {
    it('matches MODE_LABEL_STYLES for FlowMap stage labels', () => {
      expect(STAGE_LABEL_STYLES.PLAN).toEqual({ fg: 'cyan', bold: true });
      expect(STAGE_LABEL_STYLES.ACT).toEqual({ fg: 'magenta', bold: true });
      expect(STAGE_LABEL_STYLES.EVAL).toEqual({ fg: 'yellow', bold: true });
      expect(STAGE_LABEL_STYLES.AUTO).toEqual({ fg: 'green', bold: true });
    });
  });

  describe('EDGE_STYLES', () => {
    it('defines path style as dim cyan', () => {
      expect(EDGE_STYLES.path).toEqual({ fg: 'cyan', dim: true });
    });

    it('defines arrow style as magenta bold', () => {
      expect(EDGE_STYLES.arrow).toEqual({ fg: 'magenta', bold: true });
    });

    it('defines label style as magenta', () => {
      expect(EDGE_STYLES.label).toEqual({ fg: 'magenta' });
    });
  });

  describe('SECTION_DIVIDER_STYLE', () => {
    it('is magenta', () => {
      expect(SECTION_DIVIDER_STYLE).toEqual({ fg: 'magenta' });
    });
  });

  describe('LEGEND_STYLE', () => {
    it('is gray dim', () => {
      expect(LEGEND_STYLE).toEqual({ fg: 'gray', dim: true });
    });
  });

  describe('PROGRESS_BAR_STYLES', () => {
    it('defines filled style as magenta', () => {
      expect(PROGRESS_BAR_STYLES.filled).toEqual({ fg: 'magenta' });
    });

    it('defines empty style as gray dim', () => {
      expect(PROGRESS_BAR_STYLES.empty).toEqual({ fg: 'gray', dim: true });
    });
  });

  describe('getStatusStyle', () => {
    it('returns correct style for known status', () => {
      expect(getStatusStyle('running')).toEqual({ fg: 'green', bold: true });
      expect(getStatusStyle('error')).toEqual({ fg: 'red', bold: true });
    });

    it('returns inactive style for unknown status', () => {
      expect(getStatusStyle('unknown' as never)).toEqual({ fg: 'gray', dim: true });
    });
  });

  describe('getModeLabelStyle', () => {
    it('returns correct style for known mode', () => {
      expect(getModeLabelStyle('PLAN')).toEqual({ fg: 'cyan', bold: true });
      expect(getModeLabelStyle('ACT')).toEqual({ fg: 'magenta', bold: true });
    });

    it('returns dim style for active=false', () => {
      const style = getModeLabelStyle('PLAN', false);
      expect(style).toEqual({ fg: 'cyan', dim: true });
    });

    it('returns bold style for active=true', () => {
      const style = getModeLabelStyle('ACT', true);
      expect(style).toEqual({ fg: 'magenta', bold: true });
    });
  });

  describe('getStageLabelStyle', () => {
    it('returns correct style for known stage', () => {
      expect(getStageLabelStyle('PLAN')).toEqual({ fg: 'cyan', bold: true });
    });

    it('returns default style for unknown stage', () => {
      expect(getStageLabelStyle('UNKNOWN' as never)).toEqual({ fg: 'cyan', bold: true });
    });
  });

  describe('STATUS_ICONS', () => {
    it('maps all DashboardNodeStatus values', () => {
      expect(STATUS_ICONS.running).toBe('●');
      expect(STATUS_ICONS.idle).toBe('○');
      expect(STATUS_ICONS.blocked).toBe('⏸');
      expect(STATUS_ICONS.error).toBe('!');
      expect(STATUS_ICONS.done).toBe('✓');
    });
  });

  describe('GLOBAL_STATE_ICONS', () => {
    it('maps all GlobalRunState values', () => {
      expect(GLOBAL_STATE_ICONS.RUNNING).toBe('●');
      expect(GLOBAL_STATE_ICONS.IDLE).toBe('○');
      expect(GLOBAL_STATE_ICONS.ERROR).toBe('!');
    });
  });

  describe('GLOBAL_STATE_COLORS', () => {
    it('maps all GlobalRunState values', () => {
      expect(GLOBAL_STATE_COLORS.RUNNING).toBe('green');
      expect(GLOBAL_STATE_COLORS.IDLE).toBe('gray');
      expect(GLOBAL_STATE_COLORS.ERROR).toBe('red');
    });
  });

  describe('getNodeStatusColor', () => {
    it('returns fg color string for known status', () => {
      expect(getNodeStatusColor('running')).toBe('green');
      expect(getNodeStatusColor('error')).toBe('red');
      expect(getNodeStatusColor('idle')).toBe('gray');
      expect(getNodeStatusColor('blocked')).toBe('yellow');
      expect(getNodeStatusColor('done')).toBe('green');
    });

    it('returns gray for unknown status', () => {
      expect(getNodeStatusColor('unknown' as never)).toBe('gray');
    });
  });

  describe('getModeColor', () => {
    it('returns fg color string for known mode', () => {
      expect(getModeColor('PLAN')).toBe('cyan');
      expect(getModeColor('ACT')).toBe('magenta');
      expect(getModeColor('EVAL')).toBe('yellow');
      expect(getModeColor('AUTO')).toBe('green');
    });

    it('returns cyan for unknown mode', () => {
      expect(getModeColor('UNKNOWN' as never)).toBe('cyan');
    });
  });

  describe('GLOW_STYLE', () => {
    it('should have green dim style for glow effect', () => {
      expect(GLOW_STYLE).toEqual({ fg: 'green', dim: true });
    });
  });

  describe('PIPELINE_STYLES', () => {
    it('should have arrow and connector styles', () => {
      expect(PIPELINE_STYLES.arrow).toBeDefined();
      expect(PIPELINE_STYLES.arrow.fg).toBe('magenta');
      expect(PIPELINE_STYLES.connector).toBeDefined();
    });
  });

  describe('PROGRESS_BAR_CHARS', () => {
    it('should have filled and empty characters', () => {
      expect(PROGRESS_BAR_CHARS.filled).toBe('█');
      expect(PROGRESS_BAR_CHARS.empty).toBe('░');
    });
  });

  describe('CellStyle type', () => {
    it('accepts valid CellStyle values', () => {
      const style: CellStyle = { fg: 'cyan', bold: true };
      expect(style.fg).toBe('cyan');
      expect(style.bold).toBe(true);
    });

    it('accepts partial CellStyle', () => {
      const style: CellStyle = { dim: true };
      expect(style.dim).toBe(true);
      expect(style.fg).toBeUndefined();
    });

    it('accepts empty CellStyle', () => {
      const style: CellStyle = {};
      expect(style).toEqual({});
    });
  });

  describe('AGENT_AVATARS', () => {
    it('solution-architect 키에 🏛️ 매핑', () => {
      expect(AGENT_AVATARS['solution-architect']).toBe('🏛️');
    });

    it('frontend 키에 🎨 매핑', () => {
      expect(AGENT_AVATARS['frontend']).toBe('🎨');
    });

    it('plan-mode 키에 📋 매핑', () => {
      expect(AGENT_AVATARS['plan-mode']).toBe('📋');
    });
  });

  describe('getAgentAvatar', () => {
    it('solution-architect 이름에 🏛️ 반환', () => {
      expect(getAgentAvatar('solution-architect')).toBe('🏛️');
    });

    it('frontend 포함 이름에 🎨 반환', () => {
      expect(getAgentAvatar('frontend-developer')).toBe('🎨');
    });

    it('알 수 없는 에이전트에 기본값 🤖 반환', () => {
      expect(getAgentAvatar('unknown-agent')).toBe('🤖');
    });

    it('대소문자 구분 없이 매칭', () => {
      expect(getAgentAvatar('Frontend-Developer')).toBe('🎨');
    });

    it('plan-mode 키워드에 📋 반환', () => {
      expect(getAgentAvatar('plan-mode')).toBe('📋');
    });

    it('빈 문자열에 기본값 🤖 반환', () => {
      expect(getAgentAvatar('')).toBe('🤖');
    });
  });
});
