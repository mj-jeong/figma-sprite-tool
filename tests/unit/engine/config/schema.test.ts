/**
 * Tests for configuration schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  SpriteConfigSchema,
  validateConfig,
  parseConfig,
  getDefaultConfig,
  validateField,
} from '../../../../src/engine/config/schema.js';

describe('SpriteConfigSchema', () => {
  const validConfig = {
    figma: {
      fileKey: 'AbCdEf123456',
      page: 'Design System / Icons',
      scope: {
        type: 'prefix' as const,
        value: 'ic/',
      },
    },
    output: {
      dir: 'assets/sprite',
      name: 'sprite',
    },
    formats: {
      png: {
        enabled: true,
        scale: 2 as const,
        padding: 2,
      },
      svg: {
        enabled: true,
        svgo: true,
      },
    },
    naming: {
      idFormat: '{name}-{size}-{style}',
      sanitize: true,
    },
  };

  it('should validate correct config', () => {
    const result = validateConfig(validConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.figma.fileKey).toBe('AbCdEf123456');
    }
  });

  it('should require figma.fileKey', () => {
    const invalid = {
      ...validConfig,
      figma: {
        ...validConfig.figma,
        fileKey: '',
      },
    };

    const result = validateConfig(invalid);
    expect(result.success).toBe(false);
  });

  it('should require figma.page', () => {
    const invalid = {
      ...validConfig,
      figma: {
        ...validConfig.figma,
        page: '',
      },
    };

    const result = validateConfig(invalid);
    expect(result.success).toBe(false);
  });

  it('should require figma.scope.type to be "prefix"', () => {
    const invalid = {
      ...validConfig,
      figma: {
        ...validConfig.figma,
        scope: {
          type: 'invalid',
          value: 'ic/',
        },
      },
    };

    const result = validateConfig(invalid);
    expect(result.success).toBe(false);
  });

  it('should apply default values', () => {
    const minimal = {
      figma: {
        fileKey: 'test',
        page: 'Icons',
        scope: {
          type: 'prefix' as const,
          value: 'ic/',
        },
      },
    };

    const result = validateConfig(minimal);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.output.dir).toBe('assets/sprite');
      expect(result.data.output.name).toBe('sprite');
      expect(result.data.formats.png.scale).toBe(2);
      expect(result.data.formats.png.padding).toBe(2);
      expect(result.data.formats.svg.svgo).toBe(true);
      expect(result.data.naming.sanitize).toBe(true);
    }
  });

  it('should validate png.scale is 1 or 2', () => {
    const invalid = {
      ...validConfig,
      formats: {
        ...validConfig.formats,
        png: {
          ...validConfig.formats.png,
          scale: 3,
        },
      },
    };

    const result = validateConfig(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate png.padding is non-negative', () => {
    const invalid = {
      ...validConfig,
      formats: {
        ...validConfig.formats,
        png: {
          ...validConfig.formats.png,
          padding: -1,
        },
      },
    };

    const result = validateConfig(invalid);
    expect(result.success).toBe(false);
  });
});

describe('parseConfig', () => {
  it('should parse valid config', () => {
    const config = {
      figma: {
        fileKey: 'test',
        page: 'Icons',
        scope: {
          type: 'prefix' as const,
          value: 'ic/',
        },
      },
    };

    const parsed = parseConfig(config);
    expect(parsed.figma.fileKey).toBe('test');
  });

  it('should throw error on invalid config', () => {
    const invalid = {
      figma: {
        fileKey: '',
        page: 'Icons',
      },
    };

    expect(() => parseConfig(invalid)).toThrow('Configuration validation failed');
  });

  it('should include detailed error messages', () => {
    const invalid = {
      figma: {
        fileKey: '',
        page: '',
      },
    };

    try {
      parseConfig(invalid);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).toContain('figma.fileKey');
        expect(error.message).toContain('figma.page');
      }
    }
  });
});

describe('getDefaultConfig', () => {
  it('should return default values', () => {
    const defaults = getDefaultConfig();

    expect(defaults.output?.dir).toBe('assets/sprite');
    expect(defaults.output?.name).toBe('sprite');
    expect(defaults.formats?.png.scale).toBe(2);
    expect(defaults.formats?.png.padding).toBe(2);
    expect(defaults.formats?.svg.svgo).toBe(true);
    expect(defaults.naming?.sanitize).toBe(true);
  });
});

describe('validateField', () => {
  const validConfig = {
    figma: {
      fileKey: 'test',
      page: 'Icons',
      scope: {
        type: 'prefix' as const,
        value: 'ic/',
      },
    },
  };

  it('should return true for valid field', () => {
    expect(validateField(validConfig, 'figma.fileKey')).toBe(true);
  });

  it('should return false for invalid field', () => {
    const invalid = {
      ...validConfig,
      figma: {
        ...validConfig.figma,
        fileKey: '',
      },
    };

    expect(validateField(invalid, 'figma.fileKey')).toBe(false);
  });

  it('should handle non-existent fields', () => {
    expect(validateField(validConfig, 'nonexistent.field')).toBe(true);
  });
});
