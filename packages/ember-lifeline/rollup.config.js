import { join } from 'path';
import walkSync from 'walk-sync';
import babel from '@rollup/plugin-babel';
import ts from 'rollup-plugin-ts';
import { Addon } from '@embroider/addon-dev/rollup';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const extensions = ['.js', '.ts'];

function publicEntrypoints(args) {
  return {
    name: 'addon-modules',
    buildStart() {
      for (let name of walkSync(args.srcDir, {
        globs: args.include,
      })) {
        this.emitFile({
          type: 'chunk',
          id: join(args.srcDir, name),
          fileName: name.replace('.ts', '.js'),
        });
      }
    },
  };
}

// The custom TS configuration here can be removed once https://github.com/embroider-build/embroider/issues/1094 is resolved.
export default {
  // This provides defaults that work well alongside `publicEntrypoints` below.
  // You can augment this if you need to.
  // output: { ...addon.output(), entryFileNames: '[name].js' },
  output: addon.output(),

  plugins: [
    publicEntrypoints({
      srcDir: 'src',
      include: ['**/*.ts'],
    }),

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
