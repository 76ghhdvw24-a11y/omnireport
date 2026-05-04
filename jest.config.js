module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@omnireport/shared$': '<rootDir>/packages/shared/src',
    '^@omnireport/domain$': '<rootDir>/packages/domain/src',
    '^@omnireport/infrastructure$': '<rootDir>/packages/infrastructure/src',
    '^@omnireport/use-cases$': '<rootDir>/packages/use-cases/src',
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    'apps/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};
