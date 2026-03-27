import {
  buildFace,
  mapColor,
  buildBanner,
  buildCollaboration,
  buildVisualData,
} from './visual-data.builder';

describe('buildFace', () => {
  it('creates face from eye symbol', () => {
    expect(buildFace('◇')).toBe('◇‿◇');
  });

  it('works with complex unicode symbols', () => {
    expect(buildFace('⬡')).toBe('⬡‿⬡');
    expect(buildFace('✦')).toBe('✦‿✦');
    expect(buildFace('◆')).toBe('◆‿◆');
  });

  it('works with simple ASCII', () => {
    expect(buildFace('O')).toBe('O‿O');
  });
});

describe('mapColor', () => {
  it('maps "bright" to "magenta"', () => {
    expect(mapColor('bright')).toBe('magenta');
  });

  it('passes through known ANSI colors', () => {
    expect(mapColor('blue')).toBe('blue');
    expect(mapColor('green')).toBe('green');
    expect(mapColor('red')).toBe('red');
    expect(mapColor('yellow')).toBe('yellow');
    expect(mapColor('cyan')).toBe('cyan');
  });

  it('passes through unknown color names', () => {
    expect(mapColor('purple')).toBe('purple');
  });

  it('returns "white" for undefined', () => {
    expect(mapColor(undefined)).toBe('white');
  });
});

describe('buildBanner', () => {
  it('creates ASCII banner with mode eye and name', () => {
    const banner = buildBanner('◇', 'PLAN');
    expect(banner).toBe('╭━━━━━╮\n┃ ◇‿◇ ┃ PLAN mode!\n╰━━┳━━╯');
  });

  it('works with different modes', () => {
    const banner = buildBanner('◆', 'ACT');
    expect(banner).toContain('◆‿◆');
    expect(banner).toContain('ACT mode!');
  });
});

describe('buildCollaboration', () => {
  it('returns "minimal" format when eco=true', () => {
    const result = buildCollaboration(true);
    expect(result.format).toBe('minimal');
    expect(result.renderHint).toBe('Display agent collaboration in character format');
  });

  it('returns "discussion" format when eco=false', () => {
    const result = buildCollaboration(false);
    expect(result.format).toBe('discussion');
    expect(result.renderHint).toBe('Display agent collaboration in character format');
  });
});

describe('buildVisualData', () => {
  it('builds complete visual data with all agents', () => {
    const result = buildVisualData(
      'PLAN',
      { eye: '◇', colorAnsi: 'blue', group: 'workflow' },
      { name: 'Architecture', visual: { eye: '⬡', colorAnsi: 'bright' } },
      [
        { name: 'Security', visual: { eye: '◮', colorAnsi: 'red' } },
        { name: 'Testing', visual: { eye: '⊛', colorAnsi: 'green' } },
      ],
      false,
    );

    expect(result.banner).toContain('◇‿◇');
    expect(result.banner).toContain('PLAN mode!');
    expect(result.agents).toHaveLength(3);

    // Primary agent is "analyzing"
    expect(result.agents[0]).toEqual({
      name: 'Architecture',
      face: '⬡‿⬡',
      color: 'magenta',
      status: 'analyzing',
    });

    // Specialists are "waiting"
    expect(result.agents[1]).toEqual({
      name: 'Security',
      face: '◮‿◮',
      color: 'red',
      status: 'waiting',
    });
    expect(result.agents[2]).toEqual({
      name: 'Testing',
      face: '⊛‿⊛',
      color: 'green',
      status: 'waiting',
    });

    expect(result.collaboration.format).toBe('discussion');
  });

  it('uses default eye when visual is missing', () => {
    const result = buildVisualData(
      'ACT',
      undefined,
      { name: 'Engineer' },
      [],
      true,
    );

    expect(result.banner).toContain('●‿●');
    expect(result.agents[0].face).toBe('●‿●');
    expect(result.agents[0].color).toBe('white');
  });

  it('handles no primary agent', () => {
    const result = buildVisualData(
      'EVAL',
      { eye: '⊘' },
      undefined,
      [{ name: 'Quality', visual: { eye: '⊛', colorAnsi: 'green' } }],
      true,
    );

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].status).toBe('waiting');
  });

  it('handles empty specialists', () => {
    const result = buildVisualData(
      'AUTO',
      { eye: '⟐' },
      { name: 'Architect', visual: { eye: '⬣', colorAnsi: 'bright' } },
      [],
      false,
    );

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].status).toBe('analyzing');
  });

  it('respects eco setting for collaboration format', () => {
    const ecoResult = buildVisualData('PLAN', undefined, undefined, [], true);
    expect(ecoResult.collaboration.format).toBe('minimal');

    const fullResult = buildVisualData('PLAN', undefined, undefined, [], false);
    expect(fullResult.collaboration.format).toBe('discussion');
  });

  it('handles agents with partial visual data', () => {
    const result = buildVisualData(
      'PLAN',
      { eye: '◇' },
      { name: 'Dev', visual: { eye: '★' } }, // no colorAnsi
      [{ name: 'Sec', visual: { colorAnsi: 'red' } }], // no eye
      true,
    );

    expect(result.agents[0].face).toBe('★‿★');
    expect(result.agents[0].color).toBe('white'); // default
    expect(result.agents[1].face).toBe('●‿●'); // default eye
    expect(result.agents[1].color).toBe('red');
  });
});
