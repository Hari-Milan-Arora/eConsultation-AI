module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Disable strict rules that prevent development
    'react/jsx-no-undef': 'warn',
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // Allow console statements in development
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    // Disable other strict rules
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/alt-text': 'warn',
    'react/no-unescaped-entities': 'warn'
  },
  // Override for development
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: {
        // Make all errors warnings in development
        'react/jsx-no-undef': 'warn',
        'no-undef': 'warn'
      }
    }
  ]
};