import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/cli/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: true,
  shims: true,
  splitting: false,
  minify: false,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: `.js`,
    };
  },
});
