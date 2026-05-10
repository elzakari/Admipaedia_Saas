// @ts-nocheck
/**
 * Jest configuration for ADMIPAEDIA frontend
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)': '<rootDir>/src/$1',
    '^\\.\\./config/constants$': '<rootDir>/src/__mocks__/constants.ts',
    '\\.(css|less|scss|sass)': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/jest.setup.cjs'
  ],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@tanstack|axios)).+\\.js'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'CommonJS',
        types: ['jest', 'node', '@testing-library/jest-dom']
      },
      diagnostics: {
        ignoreCodes: [1343]
      }
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ]
};
