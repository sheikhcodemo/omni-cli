import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  platform: 'node',
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['ink', 'react'],
});
