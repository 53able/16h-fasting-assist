module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['src/domain/**/*.ts'],
      rules: {
        // Domain layer must not depend on infra
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/infra/*', '../infra/*', '../../infra/*'],
                message:
                  'Domain layer (src/domain/) must not import from infra. Use ports/interfaces instead.'
              }
            ]
          }
        ]
      }
    }
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
};
