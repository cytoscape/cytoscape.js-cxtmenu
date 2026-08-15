import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'cytoscape-cxtmenu.js',
      'src/core/**',
      'src/cxtmenu.js',
      'src/defaults.js'
    ]
  },
  {
    files: [
      'src/**/*.js',
      'test/**/*.js',
      'scripts/**/*.js'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      semi: [
        'error',
        'always'
      ],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true
        }
      ],
      curly: [
        'error',
        'all'
      ]
    }
  }
];
