import unusedImports from 'eslint-plugin-unused-imports';
import react from 'eslint-plugin-react';

export default [
  {
    plugins: {
      'unused-imports': unusedImports,
      'react': react
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { 'vars': 'all', 'varsIgnorePattern': '^_', 'args': 'after-used', 'argsIgnorePattern': '^_' }
      ]
    }
  }
];
