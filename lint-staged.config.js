module.exports = {
  '*.{ts,tsx}': [
    // Note: ESLint has a known circular reference bug with FlatCompat in v9.39.1
    // Temporarily disabled in lint-staged until upstream fix
    // Run `npm run lint` manually before committing if needed
    // 'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit --pretty',
  ],
  '*.{js,jsx,json,css,md}': ['prettier --write'],
};
