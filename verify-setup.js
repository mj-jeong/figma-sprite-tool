/**
 * Phase 1 Setup Verification Script
 *
 * Verifies that all Phase 1 setup tasks are completed correctly.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  checks.push({ name, condition, details });
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.log(`✗ ${name}`);
    if (details) console.log(`  ${details}`);
  }
}

console.log('Phase 1 Setup Verification\n');

// Check package.json
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  check('package.json exists', true);
  check('Package name is correct', pkg.name === 'figma-sprite-tool');
  check('Node.js version requirement', pkg.engines?.node === '>=20.0.0');
  check('ESM module type', pkg.type === 'module');
  check('All production dependencies present',
    ['commander', 'sharp', 'potpack', 'svgo', 'zod', 'handlebars', 'picocolors']
      .every(dep => dep in (pkg.dependencies || {}))
  );
  check('All dev dependencies present',
    ['typescript', 'tsup', 'vitest', '@types/node', 'eslint', 'prettier']
      .every(dep => dep in (pkg.devDependencies || {}))
  );
  check('Build script configured', pkg.scripts?.build === 'tsup');
  check('Test script configured', pkg.scripts?.test === 'vitest');
} catch (error) {
  check('package.json exists', false, error.message);
}

// Check TypeScript config
try {
  const tsconfig = JSON.parse(readFileSync(join(__dirname, 'tsconfig.json'), 'utf-8'));
  check('tsconfig.json exists', true);
  check('Strict mode enabled', tsconfig.compilerOptions?.strict === true);
  check('Target is ES2022', tsconfig.compilerOptions?.target === 'ES2022');
  check('Module is ESNext', tsconfig.compilerOptions?.module === 'ESNext');
  check('moduleResolution is bundler', tsconfig.compilerOptions?.moduleResolution === 'bundler');
} catch (error) {
  check('tsconfig.json exists', false, error.message);
}

// Check tsup config
check('tsup.config.ts exists', existsSync(join(__dirname, 'tsup.config.ts')));

// Check vitest config
check('vitest.config.ts exists', existsSync(join(__dirname, 'vitest.config.ts')));

// Check other config files
check('.gitignore exists', existsSync(join(__dirname, '.gitignore')));
check('.npmrc exists', existsSync(join(__dirname, '.npmrc')));
check('.editorconfig exists', existsSync(join(__dirname, '.editorconfig')));
check('.prettierrc exists', existsSync(join(__dirname, '.prettierrc')));
check('eslint.config.js exists', existsSync(join(__dirname, 'eslint.config.js')));

// Check directory structure
const directories = [
  'src/cli/commands',
  'src/cli/output',
  'src/engine/config',
  'src/engine/types',
  'src/processors/figma',
  'src/processors/sprite',
  'src/processors/output',
  'src/processors/validation',
  'src/templates/scss',
  'src/templates/svg',
  'src/utils',
  'tests/unit/processors',
  'tests/unit/utils',
  'tests/integration',
  'tests/fixtures/figma-responses',
  'tests/fixtures/icons',
  'tests/fixtures/expected',
];

directories.forEach((dir) => {
  check(`Directory ${dir} exists`, existsSync(join(__dirname, dir)));
});

// Check entry point
check('CLI entry point exists', existsSync(join(__dirname, 'src/cli/index.ts')));

console.log(`\n${'='.repeat(50)}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${checks.length}`);
console.log(`${'='.repeat(50)}\n`);

if (failed === 0) {
  console.log('✓ All Phase 1 setup tasks completed successfully!');
  console.log('\nNext steps:');
  console.log('  1. Run: pnpm install');
  console.log('  2. Run: pnpm build');
  console.log('  3. Run: pnpm test');
  console.log('  4. Move to Phase 2: Core types & Config');
} else {
  console.log('✗ Some setup tasks failed. Please review the errors above.');
  process.exit(1);
}
