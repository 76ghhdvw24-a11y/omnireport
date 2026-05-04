module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@omnireport/shared$': '<rootDir>/packages/shared/src',
    '^@omnireport/domain$': '<rootDir>/packages/domain/src',
    '^@omnireport/infrastructure$': '<rootDir>/packages/infrastructure/src',
    '^@omnireport/use-cases$': '<rootDir>/packages/use-cases/src',
    '^@/lib/utils$': '<rootDir>/apps/web/src/lib/utils.ts',
    '^@/lib/auth$': '<rootDir>/apps/web/src/lib/auth.tsx',
    '^@/components/(.*)$': '<rootDir>/apps/web/src/components/$1',
  },
  collectCoverageFrom: [
    'packages/**/*.ts',
    'apps/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
      }
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/apps/web/src/__tests__/setup-jest.ts'],
};
