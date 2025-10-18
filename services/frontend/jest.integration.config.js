// services/frontend/jest.integration.config.js
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

// ESM deps used by MSW v2 that must be transformed
const esModules = [
  '@mswjs/interceptors',
  'msw',
  'until-async',
  '@bundled-es-modules'
].join('|');

const custom = {
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/setupTests.ts'],
  // You can keep jsdom; using jest-fixed-jsdom reduces polyfills
  testEnvironment: 'jest-environment-jsdom', // npm i -D jest-fixed-jsdom (or use 'jest-environment-jsdom')

  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
  },

  testMatch: ['<rootDir>/__tests__/integration/**/*.(test|spec).(ts|tsx|js|jsx)'],

  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: { global: { lines: 50,} },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*/.{js,jsx,ts,tsx}',
    '!components/**',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

module.exports = async () => {
  // Let next/jest build its base config first…
  const make = await createJestConfig(custom);
  const base = await make();

  // …then override what it normally forces (node_modules ignore).
  return {
    ...base,

    // Allow-list ESM deps so they DO get transformed
    transformIgnorePatterns: [
      `[/\\\\]node_modules[/\\\\](?!(${esModules})[/\\\\]).+\\.(js|jsx|mjs|cjs|ts|tsx)$`,
    ],

    // Ensure babel-jest handles those ESM packages
    transform: {
      ...base.transform,
      [`(${esModules}).+\\.js$`]: 'babel-jest',
    },
  };
};