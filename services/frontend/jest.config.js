// services/frontend/jest.config.js

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  testMatch: ['<rootDir>/__tests__/**/*.(test|spec).[jt]s?(x)'],

    // Ignore node_modules and build directories
    testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__tests__/setup/',
    ],
  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^until-async$': '<rootDir>/__mocks__/until-async.js',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(d3-shape|d3-path|msw|@mswjs|@bundled-es-modules|until-async|strict-event-emitter|statuses|@open-draft|headers-polyfill|outvariant|@types))',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      lines: 75,
    },
  },

  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*/.{js,jsx,ts,tsx}',
    '!components/**',
    '!**/*.d.ts', // Exclude TypeScript definition files
    '!**/node_modules/**', // Exclude node_modules
  ],
};

module.exports = createJestConfig(customJestConfig);