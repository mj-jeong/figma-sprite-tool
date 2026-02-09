/**
 * Tests for ID format presets
 */

import { describe, it, expect } from 'vitest';
import {
  ID_FORMAT_PRESETS,
  isPresetName,
  getPreset,
  getPresetNames,
  resolveIdFormat,
  type PresetName,
} from '../../../../src/engine/config/presets.js';

describe('ID_FORMAT_PRESETS', () => {
  it('should have all required presets defined', () => {
    expect(ID_FORMAT_PRESETS).toHaveProperty('simple');
    expect(ID_FORMAT_PRESETS).toHaveProperty('with-size');
    expect(ID_FORMAT_PRESETS).toHaveProperty('with-variants');
  });

  it('should have consistent preset structure', () => {
    const presetNames: PresetName[] = ['simple', 'with-size', 'with-variants'];

    for (const name of presetNames) {
      const preset = ID_FORMAT_PRESETS[name];
      expect(preset).toHaveProperty('template');
      expect(preset).toHaveProperty('description');
      expect(preset).toHaveProperty('example');
      expect(typeof preset.template).toBe('string');
      expect(typeof preset.description).toBe('string');
      expect(typeof preset.example).toBe('string');
    }
  });

  describe('simple preset', () => {
    it('should use full name template', () => {
      expect(ID_FORMAT_PRESETS.simple.template).toBe('{name}');
    });

    it('should have clear description', () => {
      expect(ID_FORMAT_PRESETS.simple.description).toContain('full');
      expect(ID_FORMAT_PRESETS.simple.description).toContain('as-is');
    });

    it('should have example matching template', () => {
      expect(ID_FORMAT_PRESETS.simple.example).toContain('ic-home-24-line');
    });
  });

  describe('with-size preset', () => {
    it('should include name and size in template', () => {
      expect(ID_FORMAT_PRESETS['with-size'].template).toBe('{name}-{size}');
    });

    it('should have clear description', () => {
      expect(ID_FORMAT_PRESETS['with-size'].description).toContain('size');
    });

    it('should have example with size', () => {
      expect(ID_FORMAT_PRESETS['with-size'].example).toContain('-24');
    });
  });

  describe('with-variants preset', () => {
    it('should include all variant dimensions in template', () => {
      const template = ID_FORMAT_PRESETS['with-variants'].template;
      expect(template).toContain('{name}');
      expect(template).toContain('{size}');
      expect(template).toContain('{style}');
      expect(template).toContain('{theme');
    });

    it('should have clear description', () => {
      expect(ID_FORMAT_PRESETS['with-variants'].description).toContain('variant');
    });

    it('should have example with variants', () => {
      const example = ID_FORMAT_PRESETS['with-variants'].example;
      expect(example).toContain('-24');
      expect(example).toContain('line');
    });
  });
});

describe('isPresetName', () => {
  it('should return true for valid preset names', () => {
    expect(isPresetName('simple')).toBe(true);
    expect(isPresetName('with-size')).toBe(true);
    expect(isPresetName('with-variants')).toBe(true);
  });

  it('should return false for invalid preset names', () => {
    expect(isPresetName('invalid')).toBe(false);
    expect(isPresetName('custom-template')).toBe(false);
    expect(isPresetName('')).toBe(false);
    expect(isPresetName('{name}')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isPresetName('Simple')).toBe(false);
    expect(isPresetName('SIMPLE')).toBe(false);
  });
});

describe('getPreset', () => {
  it('should return preset for valid names', () => {
    expect(getPreset('simple')).toEqual(ID_FORMAT_PRESETS.simple);
    expect(getPreset('with-size')).toEqual(ID_FORMAT_PRESETS['with-size']);
    expect(getPreset('with-variants')).toEqual(ID_FORMAT_PRESETS['with-variants']);
  });

  it('should return undefined for invalid names', () => {
    expect(getPreset('invalid')).toBeUndefined();
    expect(getPreset('')).toBeUndefined();
    expect(getPreset('{name}')).toBeUndefined();
  });
});

describe('getPresetNames', () => {
  it('should return all preset names', () => {
    const names = getPresetNames();
    expect(names).toContain('simple');
    expect(names).toContain('with-size');
    expect(names).toContain('with-variants');
  });

  it('should return exactly 3 preset names', () => {
    const names = getPresetNames();
    expect(names).toHaveLength(3);
  });
});

describe('resolveIdFormat', () => {
  describe('preset resolution', () => {
    it('should resolve simple preset to template', () => {
      expect(resolveIdFormat('simple')).toBe('{name}');
    });

    it('should resolve with-size preset to template', () => {
      expect(resolveIdFormat('with-size')).toBe('{name}-{size}');
    });

    it('should resolve with-variants preset to template', () => {
      expect(resolveIdFormat('with-variants')).toBe('{name}-{size}-{style}{theme?--{theme}}');
    });
  });

  describe('custom template passthrough', () => {
    it('should return custom template as-is', () => {
      const customTemplate = '{name}-custom';
      expect(resolveIdFormat(customTemplate)).toBe(customTemplate);
    });

    it('should handle complex custom templates', () => {
      const complexTemplate = '{name}-{size}{type?-{type}}-{style}';
      expect(resolveIdFormat(complexTemplate)).toBe(complexTemplate);
    });

    it('should handle simple custom templates', () => {
      expect(resolveIdFormat('{name}')).toBe('{name}');
      expect(resolveIdFormat('icon-{name}')).toBe('icon-{name}');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(resolveIdFormat('')).toBe('');
    });

    it('should handle invalid preset name', () => {
      const invalid = 'not-a-preset';
      expect(resolveIdFormat(invalid)).toBe(invalid);
    });

    it('should be case-sensitive for preset names', () => {
      expect(resolveIdFormat('Simple')).toBe('Simple'); // Not resolved, returned as-is
    });
  });

  describe('backward compatibility', () => {
    it('should support legacy template strings', () => {
      // Old default template
      const legacy = '{name}-{size}-{style}{theme?--{theme}}';
      expect(resolveIdFormat(legacy)).toBe(legacy);
    });

    it('should support minimal templates', () => {
      expect(resolveIdFormat('{name}')).toBe('{name}');
    });
  });
});
