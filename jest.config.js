module.exports = {
  verbose: true,
  clearMocks: true,
  testEnvironment: 'node',
  coverageProvider: 'v8',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  moduleFileExtensions: ['js', 'json', 'node'],
};
