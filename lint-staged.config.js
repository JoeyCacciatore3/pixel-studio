module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write', () => 'tsc --noEmit --pretty'],
  '*.{js,jsx,json,css,md}': ['prettier --write'],
};
