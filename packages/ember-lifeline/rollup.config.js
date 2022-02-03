// import path from 'path';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import ts from 'rollup-plugin-ts';
import { Addon } from '@embroider/addon-dev/rollup';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const extensions = ['.js', '.ts'];

export default {
  // input: path.join('src', 'index.ts'),
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  // output: { ...addon.output(), entryFileNames: '[name].js' },
  output: addon.output(),

  plugins: [
    nodeResolve({ resolveOnly: ['./'], extensions }),
    // These are the modules that users should be able to import from your
    // addon. Anything not listed here may get optimized away.
    addon.publicEntrypoints(['index.js', 'test-support/**/*.js']),

    ts({
      transpiler: 'babel',
      browserslist: false,
      tsconfig: {
        fileName: 'tsconfig.json',
        hook: (resolvedConfig) => ({ ...resolvedConfig, declaration: true }),
      },
    }),

    addon.dependencies(),

    // This babel config should *not* apply presets or compile away ES modules.
    // It exists only to provide development niceties for you, like automatic
    // template colocation.
    // See `babel.config.json` for the actual Babel configuration!
    babel({ babelHelpers: 'bundled', extensions }),

    // Remove leftover build artifacts when starting a new build.
    addon.clean(),
  ],
};
