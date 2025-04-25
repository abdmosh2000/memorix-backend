module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:jest/recommended',
    'prettier'
  ],
  plugins: ['jest'],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-constant-condition': 'error',
    'no-duplicate-imports': 'error',
    
    // Style consistency
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'arrow-parens': ['error', 'as-needed'],
    
    // Best practices
    'prefer-const': 'error',
    'prefer-template': 'warn',
    'no-var': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-else-return': 'warn',
    'no-empty-function': 'warn',
    
    // Node specific
    'node/no-unsupported-features/es-syntax': ['error', {
      version: '>=14.0.0',
      ignores: []
    }],
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'error',
    
    // Jest specific
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      // Test files
      files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'node/no-unpublished-require': 'off'
      }
    }
  ]
};
